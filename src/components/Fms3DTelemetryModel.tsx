import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { apiService } from '../services/apiService';
import type { EventRecord } from '../services/apiService';
import {
  AlertTriangle,
  Copy,
  Info,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  X,
  Zap,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Ruler,
  Waves,
  Crosshair,
  Filter,
  Layers,
  Grid,
  Target,
  Compass,
  Activity
} from 'lucide-react';

export type NodeId = 'NODE_A' | 'NODE_B' | 'NODE_C';
export type ProjectionPreset = 'Iso 3D' | 'Top Ortho' | 'Side Elevation' | 'Front Cross' | 'Axonometric';
export type SeverityFilterMode = 'ALL' | 'FAULTS_ONLY' | 'FAULTS_WARNINGS';

export interface TelemetryPoint {
  id: string;
  source_record_id: string;
  node_id: NodeId;
  timestamp: string;
  timeMs: number;
  timeNormalized: number; // 0.0 to 1.0
  severity: 'Info' | 'Warning' | 'Critical';
  category: string;
  faultCode?: string;
  message: string;
  logFamily: string;
  sourceFile: string;
  originalFields?: Record<string, unknown>;
  x: number;
  y: number;
  z: number;
  isFault?: boolean;
}

export interface FaultArcLink {
  id: string;
  sourcePoint: TelemetryPoint;
  targetPoint: TelemetryPoint;
  label: string;
}

interface Fms3DTelemetryModelProps {
  onSelectEvent?: (event: EventRecord) => void;
  standalone?: boolean;
}

// Coordinate configuration constants
const LANE_Z_COORDS: Record<NodeId, number> = {
  NODE_A: -85, // Master / Left Channel
  NODE_B: 0,   // Standby / Center Channel
  NODE_C: 85   // Auxiliary / Right Channel
};

const LANE_COLORS: Record<NodeId, { hex: number; css: string; label: string; sub: string }> = {
  NODE_A: { hex: 0x06b6d4, css: '#06b6d4', label: 'NODE A', sub: 'MASTER / CH-A' },
  NODE_B: { hex: 0x0d9488, css: '#0d9488', label: 'NODE B', sub: 'STANDBY / CH-B' },
  NODE_C: { hex: 0x8b5cf6, css: '#8b5cf6', label: 'NODE C', sub: 'AUXILIARY / CH-C' }
};

const SEVERITY_COLORS = {
  Info: { hex: 0x38bdf8, css: '#38bdf8', baseElevation: 8 },
  Warning: { hex: 0xfbbf24, css: '#fbbf24', baseElevation: 35 },
  Critical: { hex: 0xf43f5e, css: '#f43f5e', baseElevation: 75 }
};

export const Fms3DTelemetryModel: React.FC<Fms3DTelemetryModelProps> = ({ onSelectEvent }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Data states
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [primaryFault, setPrimaryFault] = useState<TelemetryPoint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<'backend' | 'empty'>('backend');
  const [dataError, setDataError] = useState<string | null>(null);

  const [timeBounds, setTimeBounds] = useState<{ min: number; max: number; startLabel: string; endLabel: string }>({
    min: 0,
    max: 1,
    startLabel: '--:--:--',
    endLabel: '--:--:--'
  });

  // Controls state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scrubProgress, setScrubProgress] = useState<number>(1.0); // 0.0 to 1.0
  const [activePerspective, setActivePerspective] = useState<ProjectionPreset>('Iso 3D');
  const [heightScale, setHeightScale] = useState<number>(1.0);
  const [pointSize, setPointSize] = useState<number>(1.0);
  
  // Auto-Spin is strictly OFF by default
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const autoSpinRef = useRef<boolean>(false);

  // Projection markings and drop lines toggle
  const [projectionGuides, setProjectionGuides] = useState<boolean>(true);

  // Theme, Audio, Fullscreen
  const [lightTheme, setLightTheme] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Node isolation & multi-channel selection
  const [activeNodes, setActiveNodes] = useState<Set<NodeId>>(new Set(['NODE_A', 'NODE_B', 'NODE_C']));

  // Severity / Fault-only filter
  const [severityFilter, setSeverityFilter] = useState<SeverityFilterMode>('ALL');

  // Pointer Maker Target Point
  const [targetPointer, setTargetPointer] = useState<TelemetryPoint | null>(null);

  // Caliper Measurement Mode
  const [caliperMode, setCaliperMode] = useState<boolean>(false);
  const [caliperFirst, setCaliperFirst] = useState<TelemetryPoint | null>(null);
  const [caliperSecond, setCaliperSecond] = useState<TelemetryPoint | null>(null);

  // Interactive selection state
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TelemetryPoint | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Three.js instance references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const pointerGroupRef = useRef<THREE.Group | null>(null);
  const guidesGroupRef = useRef<THREE.Group | null>(null);
  const laneMeshesRef = useRef<Map<NodeId, { plane: THREE.Mesh; border: THREE.LineSegments }>>(new Map());
  const pulseParticlesRef = useRef<{ mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; t: number }[]>([]);
  const pointMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseVecRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Keep autoSpinRef synchronized without triggering scene re-renders
  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  // Fetch telemetry from backend
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setDataError(null);
      try {
        const eventsRes = await apiService.getEvents({ page: 1, page_size: 500 });
        if (!active) return;

        if (eventsRes && eventsRes.items && eventsRes.items.length > 0) {
          // Map backend events into 3D points
          const validEvents = eventsRes.items
            .map(e => ({ ...e, parsedTime: Date.parse(e.event_time) }))
            .filter(e => !Number.isNaN(e.parsedTime));

          if (validEvents.length > 0) {
            const times = validEvents.map(e => e.parsedTime);
            const minT = Math.min(...times);
            const maxT = Math.max(...times);
            const spanT = Math.max(1, maxT - minT);

            let detectedPrimary: TelemetryPoint | null = null;
            const mappedPoints: TelemetryPoint[] = validEvents.map((e, idx) => {
              const tNorm = spanT > 0 ? (e.parsedTime - minT) / spanT : 0.5;
              const x = -240 + tNorm * 480;

              // Node assignment strictly preserves backend node_id
              let node: NodeId = 'NODE_B';
              if (e.node_id === 'NODE_A' || e.node_id === 'NODE_B' || e.node_id === 'NODE_C') {
                node = e.node_id as NodeId;
              }

              const z = LANE_Z_COORDS[node] + ((idx % 7) - 3) * 4;

              const msg = (e.event_message || '').toLowerCase();
              const fam = (e.log_family || '').toLowerCase();
              const isFault = fam.includes('fault') || /fault|fail|error|invalid/.test(msg);
              const isWarn = /warn|alert|reset|diverg/.test(msg);
              const severity: 'Info' | 'Warning' | 'Critical' = isFault ? 'Critical' : isWarn ? 'Warning' : 'Info';
              const baseElev = SEVERITY_COLORS[severity].baseElevation;
              const y = baseElev + ((idx % 5) - 2) * 2.5;

              // Extract actual fault code if present in message or parameters
              let faultCode: string | undefined = undefined;
              const faultMatch = e.event_message.match(/FAULT[\s_:]*([0-9A-Fa-f]+)/i) || e.event_message.match(/code[\s_:]*([0-9A-Fa-f]+)/i);
              if (faultMatch) {
                faultCode = `FAULT ${faultMatch[1]}`;
              } else if (isFault) {
                faultCode = 'FAULT';
              }

              const pt: TelemetryPoint = {
                id: `pt-${e.source_record_id || idx}`,
                source_record_id: e.source_record_id || `REC-${idx}`,
                node_id: node,
                timestamp: e.event_time,
                timeMs: e.parsedTime,
                timeNormalized: tNorm,
                severity,
                category: isFault ? 'Fault' : isWarn ? 'Warning' : 'Operational',
                faultCode,
                message: e.event_message,
                logFamily: e.log_family || 'Generic',
                sourceFile: e.source_file || 'unknown',
                originalFields: e.original_fields as Record<string, unknown>,
                x,
                y,
                z,
                isFault
              };

              if (isFault && !detectedPrimary) {
                detectedPrimary = pt;
              }
              return pt;
            });

            setPoints(mappedPoints);
                setPrimaryFault(detectedPrimary || mappedPoints[0]);
            setTargetPointer(detectedPrimary || mappedPoints[0]);
            setTimeBounds({
              min: minT,
              max: maxT,
              startLabel: new Date(minT).toISOString().substring(11, 19),
              endLabel: new Date(maxT).toISOString().substring(11, 19)
            });
            setDataSource('backend');
            setLoading(false);
            return;
          }
        }

        // Backend returned empty
        setPoints([]);
        setPrimaryFault(null);
        setTargetPointer(null);
        setDataSource('empty');
        setLoading(false);
      } catch (err: any) {
        console.warn('Backend events query error:', err);
        setPoints([]);
        setPrimaryFault(null);
        setTargetPointer(null);
        setDataSource('empty');
        setDataError(err?.message || 'Unable to connect to FMS incident intelligence backend');
        setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, []);

  // Filtered Points based on active nodes and severity filter
  const visiblePoints = useMemo(() => {
    return points.filter(pt => {
      // 1. Node filter
      if (!activeNodes.has(pt.node_id)) return false;

      // 2. Severity filter
      if (severityFilter === 'FAULTS_ONLY') {
        return pt.isFault || pt.severity === 'Critical';
      }
      if (severityFilter === 'FAULTS_WARNINGS') {
        return pt.isFault || pt.severity === 'Critical' || pt.severity === 'Warning';
      }
      return true;
    });
  }, [points, activeNodes, severityFilter]);

  // Channel distribution counts
  const channelCounts = useMemo(() => {
    let a = 0, b = 0, c = 0, faults = 0;
    points.forEach(p => {
      if (p.node_id === 'NODE_A') a++;
      if (p.node_id === 'NODE_B') b++;
      if (p.node_id === 'NODE_C') c++;
      if (p.isFault || p.severity === 'Critical') faults++;
    });
    return { a, b, c, faults };
  }, [points]);

  // Current scrub timestamp string
  const currentScrubTimeLabel = useMemo(() => {
    if (timeBounds.min === 0 && timeBounds.max === 1) return '--:--:--';
    const targetMs = timeBounds.min + scrubProgress * (timeBounds.max - timeBounds.min);
    return new Date(targetMs).toISOString().substring(11, 19);
  }, [scrubProgress, timeBounds]);

  // Three.js 3D Scene Initialization
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightTheme ? 0xf8fafc : 0x070b14);
    scene.fog = new THREE.FogExp2(lightTheme ? 0xe2e8f0 : 0x070b14, lightTheme ? 0.0004 : 0.0009);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 3000);
    camera.position.set(340, 270, 380);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 60;
    controls.maxDistance = 1400;
    controls.target.set(0, 35, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, lightTheme ? 1.5 : 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(lightTheme ? 0xffffff : 0xa5f3fc, lightTheme ? 1.3 : 0.9);
    dirLight.position.set(200, 400, 200);
    scene.add(dirLight);

    const redFaultLight = new THREE.PointLight(0xf43f5e, lightTheme ? 1.2 : 1.8, 300);
    redFaultLight.position.set(-180, 80, 85);
    scene.add(redFaultLight);

    // 6. Construct Three 3D Node Planes (Lanes)
    const lanesGroup = new THREE.Group();
    lanesGroup.name = 'lanesGroup';
    laneMeshesRef.current.clear();

    const laneConfigs: { node: NodeId; z: number; colorHex: number; name: string }[] = [
      { node: 'NODE_A', z: LANE_Z_COORDS.NODE_A, colorHex: LANE_COLORS.NODE_A.hex, name: 'NODE A' },
      { node: 'NODE_B', z: LANE_Z_COORDS.NODE_B, colorHex: LANE_COLORS.NODE_B.hex, name: 'NODE B STANDBY' },
      { node: 'NODE_C', z: LANE_Z_COORDS.NODE_C, colorHex: LANE_COLORS.NODE_C.hex, name: 'NODE C AUXILIARY' }
    ];

    laneConfigs.forEach(cfg => {
      const planeGeom = new THREE.PlaneGeometry(500, 68);
      const planeMat = new THREE.MeshBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: lightTheme ? 0.20 : 0.06,
        side: THREE.DoubleSide
      });
      const planeMesh = new THREE.Mesh(planeGeom, planeMat);
      planeMesh.rotation.x = -Math.PI / 2;
      planeMesh.position.set(0, 0, cfg.z);
      lanesGroup.add(planeMesh);

      const edges = new THREE.EdgesGeometry(planeGeom);
      const lineMat = new THREE.LineBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: lightTheme ? 0.85 : 0.5
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.rotation.x = -Math.PI / 2;
      wireframe.position.set(0, 0.1, cfg.z);
      lanesGroup.add(wireframe);

      laneMeshesRef.current.set(cfg.node, { plane: planeMesh, border: wireframe });

      // Internal transverse grid divisions along timeline
      const gridSteps = 5;
      for (let s = 1; s < gridSteps; s++) {
        const xStep = -250 + (500 / gridSteps) * s;
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(xStep, 0.2, cfg.z - 34),
          new THREE.Vector3(xStep, 0.2, cfg.z + 34)
        ]);
        const stepLine = new THREE.Line(
          lineGeom,
          new THREE.LineBasicMaterial({ color: cfg.colorHex, transparent: true, opacity: 0.18 })
        );
        lanesGroup.add(stepLine);
      }
    });

    scene.add(lanesGroup);

    // Technical floor grid
    const floorGrid = new THREE.GridHelper(560, 28, lightTheme ? 0x94a3b8 : 0x334155, lightTheme ? 0xcfdbe7 : 0x1e293b);
    floorGrid.position.y = -0.5;
    (floorGrid.material as THREE.Material).transparent = true;
    (floorGrid.material as THREE.Material).opacity = lightTheme ? 0.55 : 0.35;
    scene.add(floorGrid);

    // Translucent moving Time-Slice Analysis Scanner Plane
    const scannerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: lightTheme ? 0.25 : 0.35,
      side: THREE.DoubleSide
    });
    const scannerPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 230), scannerMat);
    scannerPlane.name = 'time-scanner-plane';
    scannerPlane.rotation.x = -Math.PI / 2;
    scannerPlane.position.set(0, 0.3, 0);
    scene.add(scannerPlane);

    // Front Longitudinal Coordinate Time Ruler with Markings
    const rulerGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-250, 0.2, 135),
      new THREE.Vector3(250, 0.2, 135)
    ]);
    const rulerLine = new THREE.Line(rulerGeom, new THREE.LineBasicMaterial({ color: lightTheme ? 0x64748b : 0x475569 }));
    scene.add(rulerLine);

    // Ruler tick marks every 50 units
    for (let rX = -250; rX <= 250; rX += 50) {
      const tickGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(rX, 0.2, 130),
        new THREE.Vector3(rX, 0.2, 140)
      ]);
      const tickLine = new THREE.Line(tickGeom, new THREE.LineBasicMaterial({ color: lightTheme ? 0x475569 : 0x64748b }));
      scene.add(tickLine);
    }

    // Vertical Severity Height Scale Ladder at left flank
    const ladderGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-260, 0, -120),
      new THREE.Vector3(-260, 90, -120)
    ]);
    const ladderLine = new THREE.Line(ladderGeom, new THREE.LineBasicMaterial({ color: lightTheme ? 0x64748b : 0x475569 }));
    scene.add(ladderLine);

    // Elevation rung marks
    [0, 8, 35, 75].forEach(elev => {
      const rungGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-265, elev, -120),
        new THREE.Vector3(-255, elev, -120)
      ]);
      const rung = new THREE.Line(rungGeom, new THREE.LineBasicMaterial({ color: elev === 75 ? 0xf43f5e : elev === 35 ? 0xfbbf24 : 0x38bdf8 }));
      scene.add(rung);
    });

    // 7. Dynamic Mesh Groups
    const pointsGroup = new THREE.Group();
    pointsGroup.name = 'pointsGroup';
    scene.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    const arcsGroup = new THREE.Group();
    arcsGroup.name = 'arcsGroup';
    scene.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    const pointerGroup = new THREE.Group();
    pointerGroup.name = 'pointerGroup';
    scene.add(pointerGroup);
    pointerGroupRef.current = pointerGroup;

    const guidesGroup = new THREE.Group();
    guidesGroup.name = 'guidesGroup';
    scene.add(guidesGroup);
    guidesGroupRef.current = guidesGroup;

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 560;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pointer event interaction for hover & inspection
    const handlePointerMove = (evt: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
      mouseVecRef.current.set(mouseX, mouseY);

      if (!cameraRef.current || !pointsGroupRef.current) return;
      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(pointsGroupRef.current.children, false);

      if (intersects.length > 0) {
        const topHit = intersects[0].object as THREE.Mesh;
        const pt = topHit.userData.point as TelemetryPoint | undefined;
        if (pt) {
          setHoveredPoint(pt);
          setHoverPosition({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredPoint(null);
      setHoverPosition(null);
      container.style.cursor = 'grab';
    };

    const handlePointerDown = () => {
      container.style.cursor = 'grabbing';
    };

    const handlePointerUp = (evt: PointerEvent) => {
      container.style.cursor = 'grab';
      const rect = container.getBoundingClientRect();
      const mouseX = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
      mouseVecRef.current.set(mouseX, mouseY);

      if (!cameraRef.current || !pointsGroupRef.current) return;
      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(pointsGroupRef.current.children, false);

      if (intersects.length > 0) {
        const topHit = intersects[0].object as THREE.Mesh;
        const pt = topHit.userData.point as TelemetryPoint | undefined;
        if (pt) {
          setSelectedPoint(pt);
          setTargetPointer(pt); // Automatically snap Pointer Maker to clicked point!
          if (onSelectEvent) {
            onSelectEvent({
              source_record_id: pt.source_record_id,
              event_time: pt.timestamp,
              node_id: pt.node_id,
              log_family: pt.logFamily,
              source_file: pt.sourceFile,
              source_sequence: null,
              event_message: pt.message,
              original_fields: pt.originalFields as any
            });
          }
          if (caliperMode) {
            if (!caliperFirst) {
              setCaliperFirst(pt);
              setCaliperSecond(null);
            } else {
              setCaliperSecond(pt);
            }
          }
          if (soundEnabled) {
            playAcousticSignature(pt);
          }
        }
      }
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerup', handlePointerUp);

    // Animation Render Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      // Controls update with smooth auto-rotation
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoSpinRef.current;
        controlsRef.current.autoRotateSpeed = 0.8;
        controlsRef.current.update();
      }

      // Update Time-Slice Scanner position along timeline
      const scanner = sceneRef.current?.getObjectByName('time-scanner-plane');
      if (scanner) {
        scanner.position.x = -250 + scrubProgress * 500;
      }

      // Animate pulse particles along arcs
      pulseParticlesRef.current.forEach(item => {
        item.t = (item.t + delta * 0.45) % 1.0;
        const pos = item.curve.getPoint(item.t);
        item.mesh.position.copy(pos);
      });

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerup', handlePointerUp);

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current && rendererRef.current.domElement) {
        if (rendererRef.current.domElement.parentElement === container) {
          container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
    };
  }, [lightTheme]);

  // Synchronize Lane Dimming with Active Nodes
  useEffect(() => {
    laneConfigsForSync();
  }, [activeNodes, lightTheme]);

  const laneConfigsForSync = () => {
    laneMeshesRef.current.forEach((meshes, node) => {
      const isActive = activeNodes.has(node);
      const mat = meshes.plane.material as THREE.MeshBasicMaterial;
      const borderMat = meshes.border.material as THREE.LineBasicMaterial;
      if (isActive) {
        mat.opacity = lightTheme ? 0.22 : 0.08;
        borderMat.opacity = lightTheme ? 0.85 : 0.55;
      } else {
        mat.opacity = 0.02;
        borderMat.opacity = 0.12;
      }
    });
  };

  // Update Points Meshes in 3D scene
  useEffect(() => {
    if (!pointsGroupRef.current) return;
    const pointsGroup = pointsGroupRef.current;

    while (pointsGroup.children.length > 0) {
      const obj = pointsGroup.children[0];
      pointsGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }
    pointMeshesRef.current.clear();

    if (visiblePoints.length === 0) return;

    const baseSphereGeom = new THREE.SphereGeometry(1, 14, 14);

    const matInfo = new THREE.MeshStandardMaterial({
      color: lightTheme ? 0x0284c7 : 0x38bdf8,
      emissive: lightTheme ? 0x0369a1 : 0x0284c7,
      emissiveIntensity: lightTheme ? 0.35 : 0.6,
      roughness: 0.25
    });
    const matWarning = new THREE.MeshStandardMaterial({
      color: lightTheme ? 0xd97706 : 0xfbbf24,
      emissive: lightTheme ? 0xb45309 : 0xd97706,
      emissiveIntensity: lightTheme ? 0.4 : 0.7,
      roughness: 0.25
    });
    const matCritical = new THREE.MeshStandardMaterial({
      color: lightTheme ? 0xe11d48 : 0xf43f5e,
      emissive: lightTheme ? 0xbe123c : 0xe11d48,
      emissiveIntensity: lightTheme ? 0.6 : 0.95,
      roughness: 0.15
    });

    visiblePoints.forEach(pt => {
      const isVisibleInScrub = pt.timeNormalized <= scrubProgress + 0.005;

      const mat = pt.severity === 'Critical' ? matCritical : pt.severity === 'Warning' ? matWarning : matInfo;
      const mesh = new THREE.Mesh(baseSphereGeom, mat);

      const computedY = pt.y * heightScale;
      mesh.position.set(pt.x, computedY, pt.z);

      const r = (pt.isFault ? 3.8 : pt.severity === 'Critical' ? 2.6 : pt.severity === 'Warning' ? 2.0 : 1.4) * pointSize;
      mesh.scale.set(r, r, r);

      mesh.visible = isVisibleInScrub;
      mesh.userData = { point: pt };

      pointsGroup.add(mesh);
      pointMeshesRef.current.set(pt.id, mesh);

      if (pt.isFault || pt.severity === 'Critical') {
        const targetRing = new THREE.Mesh(
          new THREE.RingGeometry(Math.max(r * 1.8, 6), Math.max(r * 2.2, 7.5), 32),
          new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        targetRing.rotation.x = Math.PI / 2;
        targetRing.position.set(pt.x, 0.4, pt.z);
        pointsGroup.add(targetRing);
      }
    });

    // 3D Caliper Measurement Line
    if (caliperFirst && caliperSecond) {
      const p1 = new THREE.Vector3(caliperFirst.x, caliperFirst.y * heightScale + 4, caliperFirst.z);
      const p2 = new THREE.Vector3(caliperSecond.x, caliperSecond.y * heightScale + 4, caliperSecond.z);
      const caliperGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const caliperLine = new THREE.Line(
        caliperGeom,
        new THREE.LineDashedMaterial({
          color: lightTheme ? 0x0f172a : 0x38bdf8,
          dashSize: 3,
          gapSize: 2
        })
      );
      caliperLine.computeLineDistances();
      pointsGroup.add(caliperLine);
    }
  }, [visiblePoints, scrubProgress, heightScale, pointSize, lightTheme, caliperFirst, caliperSecond]);

  // Update Projection Guides & Coordinate Markings
  useEffect(() => {
    if (!guidesGroupRef.current) return;
    const guidesGroup = guidesGroupRef.current;

    while (guidesGroup.children.length > 0) {
      const obj = guidesGroup.children[0];
      guidesGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    if (!projectionGuides || visiblePoints.length === 0) return;

    // Drop lines from points to ground lane plane
    // For performance and clarity, draw drop lines for faults, warnings, hovered, selected, and pointer target
    const targetSet = new Set<string>();
    if (selectedPoint) targetSet.add(selectedPoint.id);
    if (hoveredPoint) targetSet.add(hoveredPoint.id);
    if (targetPointer) targetSet.add(targetPointer.id);

    visiblePoints.forEach(pt => {
      const isHero = pt.isFault || pt.severity === 'Critical' || targetSet.has(pt.id) || severityFilter === 'FAULTS_ONLY';
      if (!isHero && visiblePoints.length > 80 && (pt.id.charCodeAt(pt.id.length - 1) % 4 !== 0)) return;

      const pTop = new THREE.Vector3(pt.x, pt.y * heightScale, pt.z);
      const pFloor = new THREE.Vector3(pt.x, 0.2, pt.z);

      const dropGeom = new THREE.BufferGeometry().setFromPoints([pTop, pFloor]);
      const dropLine = new THREE.Line(
        dropGeom,
        new THREE.LineDashedMaterial({
          color: pt.severity === 'Critical' ? 0xf43f5e : pt.severity === 'Warning' ? 0xfbbf24 : 0x38bdf8,
          dashSize: 1.5,
          gapSize: 1.5,
          transparent: true,
          opacity: isHero ? 0.75 : 0.25
        })
      );
      dropLine.computeLineDistances();
      guidesGroup.add(dropLine);

      // Floor reticle circle on lane plane
      const reticleGeom = new THREE.RingGeometry(1.2, 1.8, 16);
      const reticleMat = new THREE.MeshBasicMaterial({
        color: pt.severity === 'Critical' ? 0xf43f5e : pt.severity === 'Warning' ? 0xfbbf24 : 0x38bdf8,
        transparent: true,
        opacity: isHero ? 0.8 : 0.25,
        side: THREE.DoubleSide
      });
      const reticle = new THREE.Mesh(reticleGeom, reticleMat);
      reticle.rotation.x = Math.PI / 2;
      reticle.position.copy(pFloor);
      guidesGroup.add(reticle);
    });
  }, [projectionGuides, visiblePoints, selectedPoint, hoveredPoint, targetPointer, heightScale, severityFilter]);

  // Update Pointer Maker 3D Target Marker
  useEffect(() => {
    if (!pointerGroupRef.current) return;
    const pointerGroup = pointerGroupRef.current;

    while (pointerGroup.children.length > 0) {
      const obj = pointerGroup.children[0];
      pointerGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    if (!targetPointer) return;

    const posY = targetPointer.y * heightScale;
    const posX = targetPointer.x;
    const posZ = targetPointer.z;

    // 1. Inverted 3D Arrow Cone pointing directly at point
    const coneGeom = new THREE.ConeGeometry(5, 14, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });
    const coneMesh = new THREE.Mesh(coneGeom, coneMat);
    coneMesh.rotation.x = Math.PI; // point downwards
    coneMesh.position.set(posX, posY + 22, posZ);
    pointerGroup.add(coneMesh);

    // 2. Vertical Laser Beacon Pillar
    const beaconGeom = new THREE.CylinderGeometry(0.5, 0.5, 120, 8);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.4
    });
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.set(posX, 60, posZ);
    pointerGroup.add(beaconMesh);

    // 3. Concentric Ground Target Reticle Rings
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(8, 9.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring1.rotation.x = Math.PI / 2;
    ring1.position.set(posX, 0.5, posZ);
    pointerGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(13, 14.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(posX, 0.5, posZ);
    pointerGroup.add(ring2);

    // 4. Floating 3D Billboard HUD Badge
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = lightTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(7, 11, 20, 0.92)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 18);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 24px ui-monospace, monospace';
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('TARGET POINTER', 24, 46);

      ctx.font = 'bold 26px ui-monospace, monospace';
      ctx.fillStyle = lightTheme ? '#0f172a' : '#f8fafc';
      const timeStr = targetPointer.timestamp.length >= 19 ? targetPointer.timestamp.slice(11, 19) : targetPointer.timestamp;
      ctx.fillText(`${targetPointer.source_record_id} • ${timeStr} UTC`, 24, 88);

      ctx.font = '22px ui-monospace, monospace';
      ctx.fillStyle = targetPointer.severity === 'Critical' ? '#e11d48' : '#64748b';
      ctx.fillText(`• ${targetPointer.node_id} | ${targetPointer.faultCode || targetPointer.category}`, 24, 124);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(56, 20, 1);
    sprite.position.set(posX, posY + 36, posZ);
    pointerGroup.add(sprite);
  }, [targetPointer, heightScale, lightTheme]);

  // Audio sonification
  const playAcousticSignature = useCallback((pt: TelemetryPoint) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = pt.isFault || pt.severity === 'Critical' ? 1046.5 : pt.severity === 'Warning' ? 784 : 523.25;
      osc.type = pt.isFault ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);

    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  const formatDelta = (deltaMs: number) => {
    if (!Number.isFinite(deltaMs)) return 'unknown';
    if (deltaMs < 1000) return `${Math.round(deltaMs)} ms`;
    if (deltaMs < 60000) return `${(deltaMs / 1000).toFixed(1)} s`;
    return `${(deltaMs / 60000).toFixed(1)} min`;
  };

  // Camera Perspective / Projection Presets
  const setPerspective = (preset: ProjectionPreset) => {
    setActivePerspective(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'Iso 3D':
        camera.position.set(340, 270, 380);
        controls.target.set(0, 35, 0);
        break;
      case 'Top Ortho':
        camera.position.set(0, 580, 0);
        controls.target.set(0, 0, 0);
        break;
      case 'Side Elevation':
        camera.position.set(0, 75, 520);
        controls.target.set(0, 35, 0);
        break;
      case 'Front Cross':
        camera.position.set(-520, 75, 0);
        controls.target.set(0, 35, 0);
        break;
      case 'Axonometric':
        camera.position.set(320, 360, 320);
        controls.target.set(0, 30, 0);
        break;
    }
    controls.update();
  };

  // Node separation shortcuts
  const selectSingleNode = (node: NodeId) => {
    setActiveNodes(new Set([node]));
    if (cameraRef.current && controlsRef.current) {
      const z = LANE_Z_COORDS[node];
      cameraRef.current.position.set(180, 140, z + 220);
      controlsRef.current.target.set(0, 30, z);
      controlsRef.current.update();
    }
  };

  const selectNodePair = (n1: NodeId, n2: NodeId) => {
    setActiveNodes(new Set([n1, n2]));
    if (cameraRef.current && controlsRef.current) {
      const z = (LANE_Z_COORDS[n1] + LANE_Z_COORDS[n2]) / 2;
      cameraRef.current.position.set(280, 220, z + 300);
      controlsRef.current.target.set(0, 35, z);
      controlsRef.current.update();
    }
  };

  const selectAllNodes = () => {
    setActiveNodes(new Set(['NODE_A', 'NODE_B', 'NODE_C']));
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(340, 270, 380);
      controlsRef.current.target.set(0, 35, 0);
      controlsRef.current.update();
    }
  };

  const toggleNode = (node: NodeId) => {
    setActiveNodes(prev => {
      const next = new Set(prev);
      if (next.has(node)) {
        if (next.size > 1) next.delete(node); // Prevent 0 nodes
      } else {
        next.add(node);
      }
      return next;
    });
  };

  // Jump to Target Pointer or Fault
  const handleFocusPointer = () => {
    const pt = targetPointer || primaryFault;
    if (!pt) return;
    setSelectedPoint(pt);
    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      camera.position.set(pt.x + 90, 120, pt.z + 140);
      controlsRef.current.target.set(pt.x, pt.y * heightScale + 10, pt.z);
      controlsRef.current.update();
    }
  };

  // Playback handlers
  const handleTogglePlay = () => setIsPlaying(p => !p);
  const handleReplay = () => {
    setScrubProgress(0);
    setIsPlaying(true);
  };

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubProgress(p => {
        if (p >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return Math.min(1.0, p + 0.0035);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={`relative rounded-xl overflow-hidden border shadow-2xl flex flex-col ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
    } ${lightTheme ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-100'}`}>
      
      {/* 1. TOP BUILDER OF DATA HUD BAR */}
      <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono z-20 ${
        lightTheme ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        {/* Left: Telemetry Builder Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-600">
            <Activity className="w-4 h-4" />
            <span>FMS 3D Telemetry Builder:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
              dataSource === 'backend' && points.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}>
              {dataSource === 'backend' && points.length > 0
                ? `● ${visiblePoints.length}/${points.length} Active`
                : '○ No Log Records'}
            </span>

            <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span className="text-cyan-600 font-semibold">A:{channelCounts.a}</span>
              <span>•</span>
              <span className="text-teal-600 font-semibold">B:{channelCounts.b}</span>
              <span>•</span>
              <span className="text-violet-600 font-semibold">C:{channelCounts.c}</span>
              <span>•</span>
              <span className="text-rose-600 font-semibold">Faults:{channelCounts.faults}</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500">
              <span>Time: <strong className="text-slate-700 font-semibold">{timeBounds.startLabel}</strong> → <strong className="text-slate-700 font-semibold">{timeBounds.endLabel}</strong> UTC</span>
            </div>
          </div>
        </div>

        {/* Right: View & Feature Actions */}
        <div className="flex items-center gap-2">
          {/* Projection Drop Markings Toggle */}
          <button
            onClick={() => setProjectionGuides(g => !g)}
            className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1 transition-all ${
              projectionGuides
                ? 'bg-cyan-50 border-cyan-400 text-cyan-800 font-bold'
                : lightTheme ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Toggle 3D coordinate drop stems and ground reticles"
          >
            <Grid className="w-3.5 h-3.5 text-cyan-600" />
            <span>Markings: {projectionGuides ? 'ON' : 'OFF'}</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setLightTheme(t => !t)}
            className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1 font-semibold transition-all ${
              lightTheme
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title="Switch theme"
          >
            {lightTheme ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{lightTheme ? 'Dark' : 'Light'}</span>
          </button>

          {/* Sonification Toggle */}
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className={`p-1.5 rounded-md border transition-all ${
              soundEnabled
                ? 'bg-cyan-100 border-cyan-400 text-cyan-800'
                : lightTheme ? 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Acoustic feedback: ON' : 'Acoustic feedback: OFF'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className={`p-1.5 rounded-md border transition-colors ${
              lightTheme ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Fullscreen 3D Cockpit"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. CHANNELS & PROJECTION FILTER STRIP */}
      <div className={`px-5 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono z-20 ${
        lightTheme ? 'bg-slate-50/95 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-800 text-slate-300'
      }`}>
        {/* Node Separation Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-bold text-[11px] uppercase mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-600" />
            <span>Channels:</span>
          </span>

          <button
            onClick={selectAllNodes}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              activeNodes.size === 3
                ? 'bg-cyan-600 text-white border-cyan-700 shadow-xs'
                : lightTheme ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            All (A+B+C)
          </button>

          <button
            onClick={() => selectSingleNode('NODE_A')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              activeNodes.size === 1 && activeNodes.has('NODE_A')
                ? 'bg-cyan-600 text-white border-cyan-700'
                : lightTheme ? 'bg-white border-slate-300 text-cyan-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-cyan-400'
            }`}
          >
            Node A Only
          </button>

          <button
            onClick={() => selectSingleNode('NODE_B')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              activeNodes.size === 1 && activeNodes.has('NODE_B')
                ? 'bg-teal-600 text-white border-teal-700'
                : lightTheme ? 'bg-white border-slate-300 text-teal-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-teal-400'
            }`}
          >
            Node B Only
          </button>

          <button
            onClick={() => selectSingleNode('NODE_C')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              activeNodes.size === 1 && activeNodes.has('NODE_C')
                ? 'bg-violet-600 text-white border-violet-700'
                : lightTheme ? 'bg-white border-slate-300 text-violet-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-violet-400'
            }`}
          >
            Node C Only
          </button>

          {/* 2 Nodes Together Shortcuts */}
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Individual Channel Checkbox Toggles */}
          {(['NODE_A', 'NODE_B', 'NODE_C'] as const).map(n => (
            <button
              key={n}
              onClick={() => toggleNode(n)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                activeNodes.has(n)
                  ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-400'
                  : 'bg-transparent text-slate-400 border-slate-300 dark:border-slate-700 opacity-60'
              }`}
              title={`Toggle ${n}`}
            >
              <span>{activeNodes.has(n) ? '✓' : '✗'}</span>
              <span>{n.replace('NODE_', '')}</span>
            </button>
          ))}

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          <button
            onClick={() => selectNodePair('NODE_A', 'NODE_B')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              activeNodes.size === 2 && activeNodes.has('NODE_A') && activeNodes.has('NODE_B')
                ? 'bg-slate-800 text-white border-slate-900'
                : lightTheme ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            A + B
          </button>

          <button
            onClick={() => selectNodePair('NODE_B', 'NODE_C')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              activeNodes.size === 2 && activeNodes.has('NODE_B') && activeNodes.has('NODE_C')
                ? 'bg-slate-800 text-white border-slate-900'
                : lightTheme ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            B + C
          </button>

          <button
            onClick={() => selectNodePair('NODE_A', 'NODE_C')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              activeNodes.size === 2 && activeNodes.has('NODE_A') && activeNodes.has('NODE_C')
                ? 'bg-slate-800 text-white border-slate-900'
                : lightTheme ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            A + C
          </button>
        </div>

        {/* Severity / Fault Isolation Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-bold text-[11px] uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-rose-500" />
            <span>Filter:</span>
          </span>

          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              severityFilter === 'ALL'
                ? 'bg-slate-700 text-white border-slate-800'
                : lightTheme ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            All Events
          </button>

          <button
            onClick={() => setSeverityFilter('FAULTS_ONLY')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-all ${
              severityFilter === 'FAULTS_ONLY'
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs shadow-rose-500/30'
                : lightTheme ? 'bg-white border-rose-300 text-rose-700 hover:bg-rose-50' : 'bg-slate-800 border-rose-800 text-rose-400'
            }`}
          >
            Pure 3D Faults Only
          </button>

          <button
            onClick={() => setSeverityFilter('FAULTS_WARNINGS')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
              severityFilter === 'FAULTS_WARNINGS'
                ? 'bg-amber-600 text-white border-amber-700'
                : lightTheme ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            Faults + Warnings
          </button>
        </div>
      </div>

      {/* 3. 3D VIEWPORT CONTAINER */}
      <div
        ref={mountRef}
        className={`relative w-full h-[540px] md:h-[600px] outline-none select-none cursor-grab active:cursor-grabbing ${
          lightTheme ? 'bg-slate-100' : 'bg-slate-950'
        }`}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className={`absolute inset-0 flex items-center justify-center z-30 font-mono text-xs ${
            lightTheme ? 'bg-white/85 text-cyan-700' : 'bg-slate-950/80 text-cyan-400'
          }`}>
            <span className="animate-spin mr-2">⚙</span> Synchronizing 3D multi-node telemetry...
          </div>
        )}

        {/* Empty / Error Notice */}
        {!loading && points.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 font-mono text-xs p-6 text-center">
            <div className={`p-4 rounded-xl border max-w-md ${
              lightTheme ? 'bg-white border-slate-300 text-slate-700 shadow-md' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <div className="font-bold text-sm mb-1">No FMS Telemetry Records Loaded</div>
              <p className="text-[11px] text-slate-500 mb-3">
                {dataError || 'The FMS backend returned 0 logged events. Upload or ingest flight log records to visualize multi-channel telemetry.'}
              </p>
            </div>
          </div>
        )}

        {/* Real-time Scanner Badge */}
        <div className={`absolute left-5 top-4 z-20 px-3 py-1.5 rounded-lg border pointer-events-none flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${
          lightTheme ? 'bg-white/90 border-slate-200 text-slate-700 shadow-xs' : 'bg-slate-900/85 border-slate-700 text-slate-300'
        }`}>
          <Waves className={`w-3.5 h-3.5 ${lightTheme ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <span>Timeline Scan:</span>
          <strong className={lightTheme ? 'text-cyan-700 font-bold' : 'text-cyan-300 font-bold'}>{currentScrubTimeLabel}</strong>
        </div>

        {/* Pointer Target Indicator Badge */}
        {targetPointer && (
          <div className={`absolute right-5 top-4 z-20 px-3 py-1.5 rounded-lg border flex items-center gap-2 text-[10px] font-mono ${
            lightTheme ? 'bg-cyan-50/95 border-cyan-300 text-cyan-900 shadow-xs' : 'bg-cyan-950/85 border-cyan-700 text-cyan-200'
          }`}>
            <Target className="w-3.5 h-3.5 text-cyan-600" />
            <span>Target: <strong>{targetPointer.source_record_id}</strong> ({targetPointer.node_id})</span>
            <button
              onClick={handleFocusPointer}
              className="ml-1 px-1.5 py-0.5 rounded bg-cyan-600 text-white font-bold hover:bg-cyan-700 pointer-events-auto"
            >
              Focus
            </button>
          </div>
        )}

        {/* 3D Caliper Delta HUD Banner */}
        {caliperFirst && (
          <div className={`absolute top-14 left-5 z-20 px-3 py-1.5 rounded-lg border font-mono text-[11px] flex items-center gap-2 shadow-md ${
            lightTheme ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/90 border-amber-700 text-amber-200'
          }`}>
            <Ruler className="w-3.5 h-3.5 text-amber-600" />
            <span>P1: {caliperFirst.timestamp.slice(11, 19)} ({caliperFirst.node_id})</span>
            {caliperSecond ? (
              <>
                <span className="font-bold">➔</span>
                <span>P2: {caliperSecond.timestamp.slice(11, 19)} ({caliperSecond.node_id})</span>
                <span className="font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">
                  Δt = {formatDelta(Math.abs(caliperSecond.timeMs - caliperFirst.timeMs))}
                </span>
              </>
            ) : (
              <span className="italic text-amber-700 dark:text-amber-300 animate-pulse">Click 2nd point to measure Δt...</span>
            )}
            <button
              onClick={() => { setCaliperFirst(null); setCaliperSecond(null); setCaliperMode(false); }}
              className="ml-2 px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold hover:bg-amber-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Axis Marker Bottom-Left Watermark */}
        <div className="absolute bottom-4 left-5 z-20 pointer-events-none select-none">
          <span className={`text-[11px] font-mono tracking-widest font-bold uppercase drop-shadow-sm ${
            lightTheme ? 'text-slate-500' : 'text-slate-400'
          }`}>
            TIME &times; SEVERITY &times; NODE (FMS 3D)
          </span>
        </div>

        {/* Hover Tooltip HUD */}
        {hoveredPoint && hoverPosition && !selectedPoint && (
          <div
            className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: hoverPosition.x, top: hoverPosition.y }}
          >
            <div className={`backdrop-blur-md rounded-lg p-2.5 shadow-xl text-xs font-mono max-w-xs space-y-1 border ${
              lightTheme ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50' : 'bg-slate-900/95 border-slate-700/80 text-slate-100'
            }`}>
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                <span className="font-bold" style={{ color: LANE_COLORS[hoveredPoint.node_id].css }}>
                  {LANE_COLORS[hoveredPoint.node_id].label}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  hoveredPoint.severity === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                  hoveredPoint.severity === 'Warning' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-cyan-100 text-cyan-800 border border-cyan-300'
                }`}>
                  {hoveredPoint.severity}
                </span>
              </div>
              <div className="text-[11px] truncate">
                {hoveredPoint.faultCode ? (
                  <strong className="text-rose-600 mr-1">{hoveredPoint.faultCode}:</strong>
                ) : null}
                {hoveredPoint.message}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>{hoveredPoint.timestamp.length >= 19 ? hoveredPoint.timestamp.slice(11, 19) : hoveredPoint.timestamp} UTC</span>
                <span className="text-cyan-600 font-sans">Tap to inspect &rarr;</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM CONTROLS BAR: TIMELINE REPLAY & FAULT JUMP */}
      <div className={`px-5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono z-20 border-t ${
        lightTheme ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/95 border-slate-800 text-slate-200'
      }`}>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                : lightTheme ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-rose-600" />
                <span>Pause Replay</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-cyan-600" />
                <span>Play Timeline</span>
              </>
            )}
          </button>

          <button
            onClick={handleReplay}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
              lightTheme ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Replay from start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <span className="text-slate-400 pl-1">{timeBounds.startLabel}</span>
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 max-w-2xl flex items-center space-x-3 px-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.002"
            value={scrubProgress}
            onChange={(e) => {
              setScrubProgress(parseFloat(e.target.value));
              if (isPlaying) setIsPlaying(false);
            }}
            className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600 focus:outline-none"
          />
          <span className="text-cyan-600 font-bold shrink-0">{currentScrubTimeLabel}</span>
          <span className="text-slate-400 shrink-0">{timeBounds.endLabel}</span>
        </div>

        {/* Target Pointer Focus Button */}
        <div className="flex items-center space-x-2">
          {primaryFault && (
            <button
              onClick={handleFocusPointer}
              className="px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 flex items-center gap-1.5 font-bold transition-all shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-rose-600" />
              <span>Jump to Recorded Fault</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. BOTTOM CONTROLS BAR: 3D PROJECTION ADJUSTMENTS & POINTER CONTROLS */}
      <div className={`px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono z-20 border-t ${
        lightTheme ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
      }`}>
        {/* Perspective / Projection Adjustments */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-cyan-700 dark:text-cyan-400 font-bold flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5" />
            <span>PROJECTION:</span>
          </span>

          {(['Iso 3D', 'Top Ortho', 'Side Elevation', 'Front Cross', 'Axonometric'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPerspective(p)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activePerspective === p
                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                  : lightTheme ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Height Scale, Point Size, Calipers, Auto-Spin */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Height:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={heightScale}
              onChange={(e) => setHeightScale(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <span className="text-cyan-600 w-8">{heightScale.toFixed(1)}x</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500">Scale:</span>
            <input
              type="range"
              min="0.6"
              max="2.2"
              step="0.1"
              value={pointSize}
              onChange={(e) => setPointSize(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
          </div>

          {/* Caliper Measurement Tool */}
          <button
            onClick={() => {
              setCaliperMode(m => !m);
              if (caliperMode) {
                setCaliperFirst(null);
                setCaliperSecond(null);
              }
            }}
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1 font-semibold transition-all ${
              caliperMode
                ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold shadow-xs'
                : lightTheme ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Measure delta between any 2 points"
          >
            <Ruler className="w-3.5 h-3.5 text-amber-600" />
            <span>{caliperMode ? (caliperFirst ? 'Select 2nd' : 'Select 1st') : 'Calipers'}</span>
          </button>

          {/* Auto-Spin Toggle - Strictly OFF by default */}
          <button
            onClick={() => setAutoSpin(s => !s)}
            className={`px-2.5 py-1 rounded-md border transition-colors ${
              autoSpin
                ? 'bg-cyan-100 text-cyan-800 border-cyan-400 font-bold'
                : lightTheme ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            Auto-Spin: {autoSpin ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 6. RIGHT-SIDE EVIDENCE INSPECTION DRAWER */}
      {selectedPoint && (
        <div className={`absolute top-0 right-0 bottom-0 w-full sm:w-[420px] z-40 border-l shadow-2xl flex flex-col backdrop-blur-xl ${
          lightTheme ? 'bg-white/98 border-slate-300 text-slate-800' : 'bg-slate-900/98 border-slate-700/80 text-slate-100'
        }`}>
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            lightTheme ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg ${
                selectedPoint.severity === 'Critical' ? 'bg-rose-100 text-rose-700 border border-rose-300' :
                selectedPoint.severity === 'Warning' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                'bg-cyan-100 text-cyan-700 border border-cyan-300'
              }`}>
                {selectedPoint.severity === 'Critical' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="text-sm font-bold font-sans flex items-center gap-2">
                  <span>Point Evidence</span>
                  {selectedPoint.faultCode && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-mono font-bold">
                      {selectedPoint.faultCode}
                    </span>
                  )}
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Record ID: <strong className="text-cyan-700">{selectedPoint.source_record_id}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPoint(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
            {/* Primary Telemetry Attributes */}
            <div className={`rounded-lg p-3 space-y-2 border ${
              lightTheme ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Channel / Node</span>
                  <span className="font-bold flex items-center gap-1.5" style={{ color: LANE_COLORS[selectedPoint.node_id].css }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANE_COLORS[selectedPoint.node_id].css }} />
                    {LANE_COLORS[selectedPoint.node_id].label} ({LANE_COLORS[selectedPoint.node_id].sub})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">UTC Timestamp</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedPoint.timestamp}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Log Family</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedPoint.logFamily}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Severity</span>
                  <span className={`font-bold ${
                    selectedPoint.severity === 'Critical' ? 'text-rose-600' :
                    selectedPoint.severity === 'Warning' ? 'text-amber-600' : 'text-cyan-600'
                  }`}>
                    {selectedPoint.severity}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Message */}
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Logged Event Message</span>
              <div className={`p-3 rounded-lg border font-mono text-[11px] leading-relaxed break-words ${
                lightTheme ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}>
                {selectedPoint.message}
              </div>
            </div>

            {/* Traceability & Source File */}
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">Traceability Origin</span>
              <div className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                lightTheme ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <div>Source File: <code className="text-slate-800 dark:text-slate-200 font-bold">{selectedPoint.sourceFile}</code></div>
                <div>3D Coordinates: <code>X: {selectedPoint.x.toFixed(1)}, Y: {(selectedPoint.y * heightScale).toFixed(1)}, Z: {selectedPoint.z.toFixed(1)}</code></div>
              </div>
            </div>

            {/* Actions: Pointer Maker & Copy */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => setTargetPointer(selectedPoint)}
                className="w-full py-2 px-3 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-700 flex items-center justify-center gap-2 shadow-xs"
              >
                <Crosshair className="w-4 h-4" />
                <span>Set Pointer Maker Here</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedPoint, null, 2));
                  setCopyFeedback(true);
                  setTimeout(() => setCopyFeedback(false), 2000);
                }}
                className={`w-full py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 ${
                  lightTheme ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span>{copyFeedback ? 'Copied Evidence JSON' : 'Copy Evidence Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
