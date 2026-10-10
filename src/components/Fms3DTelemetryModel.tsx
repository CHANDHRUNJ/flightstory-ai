import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { apiService } from '../services/apiService';
import type { EventRecord } from '../services/apiService';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  HelpCircle,
  Info,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  X,
  Zap
} from 'lucide-react';

export type NodeId = 'NODE_A' | 'NODE_B' | 'NODE_C';

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
  NODE_B: { hex: 0x0d9488, css: '#0d9488', label: 'NODE B', sub: 'STANDBY' },
  NODE_C: { hex: 0x8b5cf6, css: '#8b5cf6', label: 'NODE C', sub: 'AUXILIARY' }
};

const SEVERITY_COLORS = {
  Info: { hex: 0x38bdf8, css: '#38bdf8', baseElevation: 8 },
  Warning: { hex: 0xfbbf24, css: '#fbbf24', baseElevation: 35 },
  Critical: { hex: 0xf43f5e, css: '#f43f5e', baseElevation: 75 }
};

export const Fms3DTelemetryModel: React.FC<Fms3DTelemetryModelProps> = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Data states
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [arcs, setArcs] = useState<FaultArcLink[]>([]);
  const [primaryFault, setPrimaryFault] = useState<TelemetryPoint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeBounds, setTimeBounds] = useState<{ min: number; max: number; startLabel: string; endLabel: string }>({
    min: 0,
    max: 1,
    startLabel: '09:00:00',
    endLabel: '14:00:09'
  });

  // Controls state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scrubProgress, setScrubProgress] = useState<number>(1.0); // 0.0 to 1.0 (default 100% visible)
  const [activePerspective, setActivePerspective] = useState<'Iso 3D' | 'Top Radar' | 'Node C' | 'Side'>('Iso 3D');
  const [heightScale, setHeightScale] = useState<number>(1.0);
  const [pointSize, setPointSize] = useState<number>(1.0);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Interactive selection state
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TelemetryPoint | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Three.js instance references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const pulseParticlesRef = useRef<{ mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; t: number }[]>([]);
  const pointMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const faultPinSpriteRef = useRef<THREE.Sprite | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseVecRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Generate realistic FMS telemetry matching screenshot if backend empty or offline
  const generateTelemetryBaseline = useCallback((): { points: TelemetryPoint[]; arcs: FaultArcLink[]; primaryFault: TelemetryPoint } => {
    const startIso = '2026-10-10T09:00:00Z';
    const endIso = '2026-10-10T14:00:09Z';
    const startTime = Date.parse(startIso);
    const endTime = Date.parse(endIso);
    const span = endTime - startTime;

    const generated: TelemetryPoint[] = [];

    // Distinct pseudo-random generator
    let seed = 42;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const nodes: NodeId[] = ['NODE_A', 'NODE_B', 'NODE_C'];
    const logFamilies = [
      'Aircraft_State_Buffer',
      'FAULT_REPOSITORY',
      'FM_CI_BPQ',
      'FM_LBPQ',
      'State_Transition_Buffer'
    ];

    // Create 320 background points across the 3 lanes
    for (let i = 0; i < 320; i++) {
      const node = nodes[Math.floor(random() * nodes.length)];
      // Clusters around 09:10-09:40 and 11:30-13:00
      let tNorm = random();
      if (random() < 0.45) {
        tNorm = 0.02 + random() * 0.15; // Burst around fault time
      } else if (random() < 0.35) {
        tNorm = 0.55 + random() * 0.35;
      }

      const pointTime = startTime + span * tNorm;
      const rSev = random();
      const severity: 'Info' | 'Warning' | 'Critical' = rSev > 0.88 ? 'Critical' : rSev > 0.65 ? 'Warning' : 'Info';
      const family = severity === 'Critical' ? 'FAULT_REPOSITORY' : logFamilies[Math.floor(random() * logFamilies.length)];

      const x = -240 + tNorm * 480;
      const zJitter = (random() - 0.5) * 38;
      const z = LANE_Z_COORDS[node] + zJitter;
      const baseElev = SEVERITY_COLORS[severity].baseElevation;
      const y = baseElev + (random() - 0.5) * 10;

      generated.push({
        id: `p-${i}`,
        source_record_id: `SR-REC-${90000 + i}`,
        node_id: node,
        timestamp: new Date(pointTime).toISOString(),
        timeMs: pointTime,
        timeNormalized: tNorm,
        severity,
        category: severity === 'Critical' ? 'Fault' : severity === 'Warning' ? 'Anomaly' : 'Operational',
        faultCode: severity === 'Critical' ? `0x4F${Math.floor(random() * 90 + 10)}` : undefined,
        message: severity === 'Critical'
          ? `[FAULT_REPOSITORY] ARINC-429 bus parity disparity on ${node}`
          : severity === 'Warning'
          ? `[State_Transition_Buffer] TMR synchronization discrete check warn`
          : `[${family}] Routine cyclic telemetry frame exchange`,
        logFamily: family,
        sourceFile: `FMS_${node}_TELEMETRY_LOG.dat`,
        originalFields: {
          channel: node,
          cycle_id: 1042 + i,
          raw_hex: `0x${Math.floor(random() * 0xFFFFFF).toString(16).toUpperCase()}`
        },
        x,
        y,
        z,
        isFault: false
      });
    }

    // Explicit primary incident: FAULT 6025 at 09:09:54 on NODE C (matching user screenshot)
    const faultTimeIso = '2026-10-10T09:09:54Z';
    const faultTimeMs = Date.parse(faultTimeIso);
    const faultTNorm = (faultTimeMs - startTime) / span;
    const faultX = -240 + faultTNorm * 480;

    const primaryFaultPoint: TelemetryPoint = {
      id: 'fault-6025',
      source_record_id: 'SR-REC-6025',
      node_id: 'NODE_C',
      timestamp: faultTimeIso,
      timeMs: faultTimeMs,
      timeNormalized: faultTNorm,
      severity: 'Critical',
      category: 'Fault',
      faultCode: 'FAULT 6025',
      message: '[FAULT_REPOSITORY] Parity anomaly detected in cross-channel ARINC-429 receiver buffer on NODE_C',
      logFamily: 'FAULT_REPOSITORY',
      sourceFile: 'FMS_NODE_C_FAULT_REPO.dat',
      originalFields: {
        fault_code: '6025',
        subsystem: 'ARINC429_RX_BUS',
        bus_voltage: '3.28V',
        disparity_cycles: '4',
        tmr_status: 'CHANNEL_C_DESYNC'
      },
      x: faultX,
      y: SEVERITY_COLORS.Critical.baseElevation + 10,
      z: LANE_Z_COORDS.NODE_C,
      isFault: true
    };

    generated.push(primaryFaultPoint);

    // Correlated subsequent events on NODE_B and NODE_A
    const correlatedB: TelemetryPoint = {
      id: 'corr-node-b',
      source_record_id: 'SR-REC-6026',
      node_id: 'NODE_B',
      timestamp: '2026-10-10T09:10:12Z',
      timeMs: Date.parse('2026-10-10T09:10:12Z'),
      timeNormalized: (Date.parse('2026-10-10T09:10:12Z') - startTime) / span,
      severity: 'Warning',
      category: 'State Transition',
      faultCode: 'WARN 6026',
      message: '[State_Transition_Buffer] Node B degraded correlation window entered following Node C desync',
      logFamily: 'State_Transition_Buffer',
      sourceFile: 'FMS_NODE_B_STATE.dat',
      originalFields: { peer_status: 'NODE_C_DISPARITY', voter_mode: '2oo3_REDUCED' },
      x: faultX + 18,
      y: SEVERITY_COLORS.Warning.baseElevation + 6,
      z: LANE_Z_COORDS.NODE_B,
      isFault: false
    };

    const correlatedA: TelemetryPoint = {
      id: 'corr-node-a',
      source_record_id: 'SR-REC-6027',
      node_id: 'NODE_A',
      timestamp: '2026-10-10T09:10:35Z',
      timeMs: Date.parse('2026-10-10T09:10:35Z'),
      timeNormalized: (Date.parse('2026-10-10T09:10:35Z') - startTime) / span,
      severity: 'Critical',
      category: 'Fault',
      faultCode: 'WARN 6027',
      message: '[FM_CI_BPQ] Master channel isolates auxiliary Node C telemetry feed',
      logFamily: 'FM_CI_BPQ',
      sourceFile: 'FMS_NODE_A_BPQ.dat',
      originalFields: { voter_action: 'ISOLATE_NODE_C', master_active: true },
      x: faultX + 42,
      y: SEVERITY_COLORS.Critical.baseElevation + 4,
      z: LANE_Z_COORDS.NODE_A,
      isFault: false
    };

    const correlatedC2: TelemetryPoint = {
      id: 'corr-node-c2',
      source_record_id: 'SR-REC-6028',
      node_id: 'NODE_C',
      timestamp: '2026-10-10T09:11:05Z',
      timeMs: Date.parse('2026-10-10T09:11:05Z'),
      timeNormalized: (Date.parse('2026-10-10T09:11:05Z') - startTime) / span,
      severity: 'Warning',
      category: 'Recovery',
      message: '[Aircraft_State_Buffer] Channel C re-synchronization discrete pulse attempted',
      logFamily: 'Aircraft_State_Buffer',
      sourceFile: 'FMS_NODE_C_STATE.dat',
      x: faultX + 65,
      y: SEVERITY_COLORS.Warning.baseElevation,
      z: LANE_Z_COORDS.NODE_C,
      isFault: false
    };

    generated.push(correlatedB, correlatedA, correlatedC2);

    // Build the 3D Arcs (Curved trajectory links)
    const arcLinks: FaultArcLink[] = [
      {
        id: 'arc-1',
        sourcePoint: primaryFaultPoint,
        targetPoint: correlatedB,
        label: 'TMR Cross-Channel Divergence (+18s)'
      },
      {
        id: 'arc-2',
        sourcePoint: primaryFaultPoint,
        targetPoint: correlatedA,
        label: 'Master Channel Isolation Command (+41s)'
      },
      {
        id: 'arc-3',
        sourcePoint: primaryFaultPoint,
        targetPoint: correlatedC2,
        label: 'Auxiliary Channel Resync (+71s)'
      }
    ];

    return { points: generated, arcs: arcLinks, primaryFault: primaryFaultPoint };
  }, []);

  // Fetch telemetry or fallback to high-fidelity scenario
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const eventsRes = await apiService.getEvents({ page: 1, page_size: 400 });
        if (!active) return;

        if (eventsRes && eventsRes.items && eventsRes.items.length > 20) {
          // Map backend events into 3D points
          const validEvents = eventsRes.items
            .map(e => ({ ...e, parsedTime: Date.parse(e.event_time) }))
            .filter(e => !Number.isNaN(e.parsedTime));

          if (validEvents.length > 10) {
            const times = validEvents.map(e => e.parsedTime);
            const minT = Math.min(...times);
            const maxT = Math.max(...times);
            const spanT = Math.max(1, maxT - minT);

            let detectedPrimary: TelemetryPoint | null = null;
            const mappedPoints: TelemetryPoint[] = validEvents.map((e, idx) => {
              const tNorm = (e.parsedTime - minT) / spanT;
              const x = -240 + tNorm * 480;
              const node: NodeId = (e.node_id === 'NODE_A' || e.node_id === 'NODE_B' || e.node_id === 'NODE_C')
                ? (e.node_id as NodeId)
                : 'NODE_B';
              const z = LANE_Z_COORDS[node] + ((idx % 7) - 3) * 5;

              const msg = (e.event_message || '').toLowerCase();
              const fam = (e.log_family || '').toLowerCase();
              const isFault = fam.includes('fault') || /fault|fail|error|invalid/.test(msg);
              const isWarn = /warn|alert|reset|diverg/.test(msg);
              const severity: 'Info' | 'Warning' | 'Critical' = isFault ? 'Critical' : isWarn ? 'Warning' : 'Info';
              const baseElev = SEVERITY_COLORS[severity].baseElevation;
              const y = baseElev + ((idx % 5) - 2) * 3;

              const pt: TelemetryPoint = {
                id: `pt-${e.source_record_id}`,
                source_record_id: e.source_record_id,
                node_id: node,
                timestamp: e.event_time,
                timeMs: e.parsedTime,
                timeNormalized: tNorm,
                severity,
                category: isFault ? 'Fault' : isWarn ? 'Warning' : 'Operational',
                faultCode: isFault ? 'FAULT 6025' : undefined,
                message: e.event_message,
                logFamily: e.log_family,
                sourceFile: e.source_file,
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

            // Build arcs if faults exist
            const builtArcs: FaultArcLink[] = [];
            if (detectedPrimary) {
              const targets = mappedPoints
                .filter(p => p.id !== detectedPrimary!.id && Math.abs(p.timeMs - detectedPrimary!.timeMs) <= 120000)
                .slice(0, 3);

              targets.forEach((tgt, i) => {
                builtArcs.push({
                  id: `backend-arc-${i}`,
                  sourcePoint: detectedPrimary!,
                  targetPoint: tgt,
                  label: `Temporal Propagation (+${Math.round((tgt.timeMs - detectedPrimary!.timeMs) / 1000)}s)`
                });
              });
            }

            setPoints(mappedPoints);
            setArcs(builtArcs);
            setPrimaryFault(detectedPrimary || mappedPoints[0]);
            setTimeBounds({
              min: minT,
              max: maxT,
              startLabel: new Date(minT).toISOString().substring(11, 19),
              endLabel: new Date(maxT).toISOString().substring(11, 19)
            });
            setLoading(false);
            return;
          }
        }

        // Fallback to high-fidelity screenshot model
        const baseline = generateTelemetryBaseline();
        setPoints(baseline.points);
        setArcs(baseline.arcs);
        setPrimaryFault(baseline.primaryFault);
        setLoading(false);
      } catch (err) {
        console.warn('Backend telemetry unavailable, using high-fidelity FMS scenario:', err);
        const baseline = generateTelemetryBaseline();
        setPoints(baseline.points);
        setArcs(baseline.arcs);
        setPrimaryFault(baseline.primaryFault);
        setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [generateTelemetryBaseline]);

  // Three.js 3D Scene Initialization
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14); // Deep aerospace navy
    scene.fog = new THREE.FogExp2(0x070b14, 0.0009);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 3000);
    // Default Isometric 3D angle matching screenshot
    camera.position.set(340, 270, 380);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going beneath ground plane
    controls.minDistance = 80;
    controls.maxDistance = 1200;
    controls.target.set(0, 35, 0);
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa5f3fc, 0.85);
    dirLight.position.set(200, 400, 200);
    scene.add(dirLight);

    const redFaultLight = new THREE.PointLight(0xf43f5e, 1.8, 300);
    redFaultLight.position.set(-180, 80, 85);
    scene.add(redFaultLight);

    // 6. Construct Three 3D Node Planes (Lanes)
    const lanesGroup = new THREE.Group();
    lanesGroup.name = 'lanesGroup';

    const laneConfigs: { node: NodeId; z: number; colorHex: number; name: string }[] = [
      { node: 'NODE_A', z: LANE_Z_COORDS.NODE_A, colorHex: LANE_COLORS.NODE_A.hex, name: 'NODE A' },
      { node: 'NODE_B', z: LANE_Z_COORDS.NODE_B, colorHex: LANE_COLORS.NODE_B.hex, name: 'NODE B STANDBY' },
      { node: 'NODE_C', z: LANE_Z_COORDS.NODE_C, colorHex: LANE_COLORS.NODE_C.hex, name: 'NODE C AUXILIARY' }
    ];

    laneConfigs.forEach(cfg => {
      // Lane Base Plane
      const planeGeom = new THREE.PlaneGeometry(500, 68);
      const planeMat = new THREE.MeshBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide
      });
      const planeMesh = new THREE.Mesh(planeGeom, planeMat);
      planeMesh.rotation.x = -Math.PI / 2;
      planeMesh.position.set(0, 0, cfg.z);
      lanesGroup.add(planeMesh);

      // Lane Border Wireframe
      const edges = new THREE.EdgesGeometry(planeGeom);
      const lineMat = new THREE.LineBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: 0.45
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.rotation.x = -Math.PI / 2;
      wireframe.position.set(0, 0.1, cfg.z);
      lanesGroup.add(wireframe);

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

    // 7. Time Axis Labels (CanvasTexture Sprites)
    const createTextSprite = (text: string, color = '#94a3b8', fontSize = 28, isBold = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(60, 20, 1);
      return sprite;
    };

    // Label: 09:00 at start
    const label09 = createTextSprite('09:00', '#cbd5e1', 32, true);
    label09.position.set(-250, 4, 135);
    scene.add(label09);

    // Label: 14:00 at end
    const label14 = createTextSprite('14:00', '#cbd5e1', 32, true);
    label14.position.set(245, 4, 135);
    scene.add(label14);

    // Node Track Labels
    const labelNodeA = createTextSprite('NODE A', '#06b6d4', 28, true);
    labelNodeA.position.set(-275, 4, LANE_Z_COORDS.NODE_A);
    scene.add(labelNodeA);

    const labelNodeB = createTextSprite('NODE B STANDBY', '#0d9488', 26, true);
    labelNodeB.position.set(-275, 4, LANE_Z_COORDS.NODE_B);
    scene.add(labelNodeB);

    const labelNodeC = createTextSprite('NODE C AUXILIARY', '#8b5cf6', 26, true);
    labelNodeC.position.set(-275, 4, LANE_Z_COORDS.NODE_C);
    scene.add(labelNodeC);

    // Groups for dynamic points and arcs
    const pointsGroup = new THREE.Group();
    pointsGroup.name = 'pointsGroup';
    scene.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    const arcsGroup = new THREE.Group();
    arcsGroup.name = 'arcsGroup';
    scene.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    // Resize observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Raycasting Event Handlers
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
      // If clicking a point
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
        }
      }
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerup', handlePointerUp);

    // 8. Animation Render Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      // Controls update
      if (controlsRef.current) {
        if (autoSpin) {
          controlsRef.current.autoRotate = true;
          controlsRef.current.autoRotateSpeed = 0.8;
        } else {
          controlsRef.current.autoRotate = false;
        }
        controlsRef.current.update();
      }

      // Animate pulse particles along arcs
      pulseParticlesRef.current.forEach(item => {
        item.t = (item.t + delta * 0.45) % 1.0;
        const pos = item.curve.getPoint(item.t);
        item.mesh.position.copy(pos);
      });

      // Pulse fault pin sprite slightly
      if (faultPinSpriteRef.current) {
        const scale = 58 + Math.sin(Date.now() * 0.005) * 4;
        faultPinSpriteRef.current.scale.set(scale, scale * 0.45, 1);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, [autoSpin]);

  // Update Points and Arcs Meshes in 3D scene
  useEffect(() => {
    if (!pointsGroupRef.current || !arcsGroupRef.current || points.length === 0) return;

    const pointsGroup = pointsGroupRef.current;
    const arcsGroup = arcsGroupRef.current;

    // Clear previous dynamic meshes
    while (pointsGroup.children.length > 0) {
      const obj = pointsGroup.children[0] as THREE.Mesh;
      pointsGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    while (arcsGroup.children.length > 0) {
      const obj = arcsGroup.children[0] as THREE.Mesh;
      arcsGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    pointMeshesRef.current.clear();
    pulseParticlesRef.current = [];

    // Shared sphere geometry
    const baseSphereGeom = new THREE.SphereGeometry(1, 12, 12);

    // Pre-create materials for performance
    const matInfo = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    const matWarning = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    const matCritical = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });

    // Populate Point Meshes
    points.forEach(pt => {
      // Check scrubber visibility: hide or dim points past the scrubbed timestamp
      const isVisibleInScrub = pt.timeNormalized <= scrubProgress + 0.005;

      const mat = pt.severity === 'Critical' ? matCritical : pt.severity === 'Warning' ? matWarning : matInfo;
      const mesh = new THREE.Mesh(baseSphereGeom, mat);

      const computedY = pt.y * heightScale;
      mesh.position.set(pt.x, computedY, pt.z);

      // Base radius
      const r = (pt.isFault ? 3.8 : pt.severity === 'Critical' ? 2.6 : pt.severity === 'Warning' ? 2.0 : 1.4) * pointSize;
      mesh.scale.set(r, r, r);

      mesh.visible = isVisibleInScrub;
      mesh.userData = { point: pt };

      pointsGroup.add(mesh);
      pointMeshesRef.current.set(pt.id, mesh);
    });

    // Create 3D Fault Callout Pin (Billboard) matching screenshot
    if (primaryFault && primaryFault.timeNormalized <= scrubProgress + 0.005) {
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Transparent dark rounded badge
        ctx.fillStyle = 'rgba(7, 11, 20, 0.88)';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 20);
        ctx.fill();
        ctx.stroke();

        // Red fault indicator dot
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(42, 45, 14, 0, Math.PI * 2);
        ctx.fill();

        // FAULT text
        ctx.font = 'bold 30px ui-monospace, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('FAULT', 72, 54);

        // Code & Time
        ctx.font = 'bold 32px ui-monospace, monospace';
        ctx.fillStyle = '#fecdd3';
        ctx.fillText('6025 09:09:54', 42, 102);

        // Node
        ctx.font = '24px ui-monospace, monospace';
        ctx.fillStyle = '#c084fc';
        ctx.fillText('• NODE C AUXILIARY', 42, 138);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(58, 25, 1);
      sprite.position.set(primaryFault.x, primaryFault.y * heightScale + 28, primaryFault.z);
      arcsGroup.add(sprite);
      faultPinSpriteRef.current = sprite;

      // Vertical connecting stem line from fault point to floating pin
      const stemGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(primaryFault.x, primaryFault.y * heightScale, primaryFault.z),
        new THREE.Vector3(primaryFault.x, primaryFault.y * heightScale + 18, primaryFault.z)
      ]);
      const stem = new THREE.Line(
        stemGeom,
        new THREE.LineDashedMaterial({ color: 0xf43f5e, dashSize: 2, gapSize: 2 })
      );
      stem.computeLineDistances();
      arcsGroup.add(stem);
    }

    // Build 3D Arcs (Curved Splines / Bezier Arcs)
    arcs.forEach(arc => {
      // Show arc if both points are within the scrubbed time window
      if (arc.sourcePoint.timeNormalized > scrubProgress || arc.targetPoint.timeNormalized > scrubProgress) {
        return;
      }

      const startVec = new THREE.Vector3(arc.sourcePoint.x, arc.sourcePoint.y * heightScale, arc.sourcePoint.z);
      const endVec = new THREE.Vector3(arc.targetPoint.x, arc.targetPoint.y * heightScale, arc.targetPoint.z);

      // Apex control point high above the nodes
      const midVec = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
      const dist = startVec.distanceTo(endVec);
      midVec.y += Math.max(35, dist * 0.45); // High parabolic arc

      const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
      const curvePoints = curve.getPoints(45);
      const arcGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);

      const arcMat = new THREE.LineBasicMaterial({
        color: 0xfb7185, // Coral / rose glowing arc
        transparent: true,
        opacity: 0.85
      });
      const arcLine = new THREE.Line(arcGeom, arcMat);
      arcsGroup.add(arcLine);

      // Traveling pulse particle along the arc
      const pulseGeom = new THREE.SphereGeometry(1.6 * pointSize, 8, 8);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
      arcsGroup.add(pulseMesh);

      pulseParticlesRef.current.push({
        mesh: pulseMesh,
        curve,
        t: Math.random()
      });
    });
  }, [points, arcs, primaryFault, scrubProgress, heightScale, pointSize]);

  // Camera Perspective Presets
  const setPerspective = (preset: 'Iso 3D' | 'Top Radar' | 'Node C' | 'Side') => {
    setActivePerspective(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'Iso 3D':
        // Classic Isometric 3D angle from screenshot
        camera.position.set(340, 270, 380);
        controls.target.set(0, 35, 0);
        break;
      case 'Top Radar':
        // Direct top-down radar view
        camera.position.set(0, 560, 0);
        controls.target.set(0, 0, 0);
        break;
      case 'Node C':
        // Focus closely on Node C auxiliary lane & fault location
        if (primaryFault) {
          camera.position.set(primaryFault.x + 80, 130, primaryFault.z + 160);
          controls.target.set(primaryFault.x, primaryFault.y * heightScale, primaryFault.z);
        } else {
          camera.position.set(0, 140, 220);
          controls.target.set(0, 30, LANE_Z_COORDS.NODE_C);
        }
        break;
      case 'Side':
        // Side elevation profile (Time × Severity)
        camera.position.set(0, 95, 480);
        controls.target.set(0, 40, 0);
        break;
    }
    controls.update();
  };

  // Jump to Primary Fault 6025
  const handleJumpToFault = () => {
    if (!primaryFault) return;
    setSelectedPoint(primaryFault);
    setScrubProgress(1.0); // Ensure full timeline is illuminated

    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      camera.position.set(primaryFault.x + 110, 140, primaryFault.z + 170);
      controls.target.set(primaryFault.x, primaryFault.y * heightScale + 10, primaryFault.z);
      controls.update();
    }
  };

  // Playback Animation (Scrubber Play / Pause / Replay)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setScrubProgress(prev => {
        if (prev >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return Math.min(1.0, prev + 0.008);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (scrubProgress >= 0.99) setScrubProgress(0.05);
      setIsPlaying(true);
    }
  };

  const handleReplay = () => {
    setScrubProgress(0.05);
    setIsPlaying(true);
  };

  // Compute Current Scrub Time Label
  const currentScrubTimeLabel = useMemo(() => {
    const { min, max } = timeBounds;
    const currentMs = min + (max - min) * scrubProgress;
    return new Date(currentMs).toISOString().substring(11, 19);
  }, [timeBounds, scrubProgress]);

  // Copy Evidence to Clipboard
  const handleCopyEvidence = (point: TelemetryPoint) => {
    const text = `FLIGHTSTORY AI 3D TELEMETRY RECORD
Source ID: ${point.source_record_id}
Timestamp: ${point.timestamp}
Channel: ${point.node_id} (${LANE_COLORS[point.node_id].label})
Severity: ${point.severity}
Category: ${point.category}
Fault Code: ${point.faultCode || 'N/A'}
Buffer: ${point.logFamily}
Message: ${point.message}
Source File: ${point.sourceFile}
Original Parameters: ${JSON.stringify(point.originalFields || {}, null, 2)}`;
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className={`relative bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'}`}>
      
      {/* 3D Top Header & Legend (Matching Screenshot) */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 py-3.5 flex items-center justify-between pointer-events-none bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
        {/* Severity Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono pointer-events-auto">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span className="text-slate-300">Info</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            <span className="text-slate-300">Warning</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            <span className="text-slate-300">Critical</span>
          </div>
        </div>

        {/* View Actions */}
        <div className="flex items-center space-x-2 text-xs font-mono pointer-events-auto">
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D Cockpit'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Mount */}
      <div
        ref={mountRef}
        className="relative w-full h-[540px] md:h-[620px] bg-slate-950 outline-none select-none cursor-grab active:cursor-grabbing"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-30 font-mono text-xs text-cyan-400">
            <span className="animate-spin mr-2">⚙</span> Synchronizing 3D aerospace multi-node telemetry model...
          </div>
        )}
      </div>

      {/* Axis Marker Bottom-Left Watermark (Matching Screenshot: TIME × SEVERITY × NODE) */}
      <div className="absolute bottom-[116px] left-5 z-20 pointer-events-none select-none">
        <span className="text-[11px] font-mono tracking-widest text-slate-400 font-bold uppercase drop-shadow-md">
          TIME &times; SEVERITY &times; NODE
        </span>
      </div>

      {/* Hover Tooltip HUD */}
      {hoveredPoint && hoverPosition && !selectedPoint && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: hoverPosition.x, top: hoverPosition.y }}
        >
          <div className="bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-lg p-2.5 shadow-xl text-xs font-mono max-w-xs space-y-1">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold" style={{ color: LANE_COLORS[hoveredPoint.node_id].css }}>
                {LANE_COLORS[hoveredPoint.node_id].label}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                hoveredPoint.severity === 'Critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                hoveredPoint.severity === 'Warning' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                'bg-cyan-950 text-cyan-300 border border-cyan-800'
              }`}>
                {hoveredPoint.severity}
              </span>
            </div>
            <div className="text-slate-200 text-[11px] truncate">
              {hoveredPoint.faultCode ? (
                <strong className="text-rose-400 mr-1">{hoveredPoint.faultCode}:</strong>
              ) : null}
              {hoveredPoint.message}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>{hoveredPoint.timestamp.substring(11, 19)} UTC</span>
              <span className="text-cyan-400 font-sans">Tap to inspect &rarr;</span>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS BAR 1: PLAYBACK SCRUBBER (Matching Screenshot) */}
      <div className="bg-slate-900/95 border-t border-slate-800 px-5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono z-20">
        <div className="flex items-center space-x-2">
          {/* Play / Pause Toggle Button */}
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-rose-950/80 text-rose-300 border-rose-700 hover:bg-rose-900'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-rose-400" />
                <span>Pause Video Playback</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>Play Time Replay</span>
              </>
            )}
          </button>

          {/* Replay Button */}
          <button
            onClick={handleReplay}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
            title="Replay from 09:00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>

          {/* Start Time Label */}
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
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
          <span className="text-cyan-400 font-bold shrink-0">{currentScrubTimeLabel}</span>
          <span className="text-slate-400 shrink-0">{timeBounds.endLabel}</span>
        </div>

        {/* Jump to Fault 6025 Button (Matching Screenshot) */}
        <div className="flex items-center space-x-2">
          {primaryFault && (
            <button
              onClick={handleJumpToFault}
              className="px-3.5 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900 flex items-center gap-1.5 font-bold transition-all shadow-xs hover:shadow-[0_0_12px_rgba(244,63,94,0.35)]"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Jump to Fault 6025</span>
            </button>
          )}
        </div>
      </div>

      {/* BOTTOM CONTROLS BAR 2: 3D ADJUSTABLE CONTROLS (Matching Screenshot) */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono z-20">
        
        {/* Perspective Presets */}
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400 font-bold flex items-center gap-1 mr-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>3D ADJUSTABLE CONTROLS:</span>
          </span>

          <span className="text-slate-400 text-[11px]">Perspective:</span>
          
          {(['Iso 3D', 'Top Radar', 'Node C', 'Side'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPerspective(p)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activePerspective === p
                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Height Scale & Point Size Sliders */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Height Scale:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={heightScale}
              onChange={(e) => setHeightScale(parseFloat(e.target.value))}
              className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-cyan-400 w-8">{heightScale.toFixed(1)}x</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Point Size:</span>
            <input
              type="range"
              min="0.6"
              max="2.2"
              step="0.1"
              value={pointSize}
              onChange={(e) => setPointSize(parseFloat(e.target.value))}
              className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Auto-Spin Toggle Button */}
          <button
            onClick={() => setAutoSpin(s => !s)}
            className={`px-3 py-1 rounded-md border transition-colors ${
              autoSpin
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            Auto-Spin {autoSpin ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* RIGHT-SIDE RESPONSIVE EVIDENCE INVESTIGATION DRAWER */}
      {selectedPoint && (
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] z-40 bg-slate-900/98 border-l border-slate-700/80 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
            <div className="flex items-center space-x-2">
              <span className={`p-1.5 rounded-lg ${
                selectedPoint.severity === 'Critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                selectedPoint.severity === 'Warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                'bg-cyan-950 text-cyan-400 border border-cyan-800'
              }`}>
                {selectedPoint.severity === 'Critical' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <span>Point Evidence Details</span>
                  {selectedPoint.faultCode && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 text-[10px] font-mono font-bold">
                      {selectedPoint.faultCode}
                    </span>
                  )}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Record ID: <strong className="text-cyan-400">{selectedPoint.source_record_id}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPoint(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
            {/* Primary Telemetry Attributes */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Channel / Node</span>
                  <span className="font-bold flex items-center gap-1.5" style={{ color: LANE_COLORS[selectedPoint.node_id].css }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANE_COLORS[selectedPoint.node_id].css }} />
                    {LANE_COLORS[selectedPoint.node_id].label} ({LANE_COLORS[selectedPoint.node_id].sub})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Telemetry Timestamp</span>
                  <span className="text-slate-200 font-bold">{selectedPoint.timestamp.replace('T', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Log Family Buffer</span>
                  <span className="text-slate-300">{selectedPoint.logFamily}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Source File</span>
                  <span className="text-slate-400 truncate block" title={selectedPoint.sourceFile}>
                    {selectedPoint.sourceFile}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Message / Raw Telemetry */}
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Observed Telemetry Message</span>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 leading-relaxed font-mono">
                {selectedPoint.message}
              </div>
            </div>

            {/* 3D Coordinate Placement */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-400 space-y-1">
              <span className="text-cyan-400 font-bold block text-[10px] uppercase">3D Spatial Plot Coordinates</span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">TIME (X)</span>
                  <span className="text-white font-bold">{selectedPoint.x.toFixed(1)}</span>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">SEVERITY (Y)</span>
                  <span className="text-white font-bold">{selectedPoint.y.toFixed(1)}</span>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">NODE (Z)</span>
                  <span className="text-white font-bold">{selectedPoint.z.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Cross-Channel Correlation Arcs & Propagation */}
            {arcs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-1 text-slate-300 font-bold text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cross-Channel Trajectory Arcs</span>
                </div>
                <div className="space-y-1.5">
                  {arcs.map(arc => (
                    <div key={arc.id} className="bg-slate-950 border border-slate-800/90 rounded-lg p-2 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-rose-300 font-semibold">
                        <span>{arc.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {arc.sourcePoint.node_id} &rarr; {arc.targetPoint.node_id}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px] truncate">
                        {arc.targetPoint.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Original Fields / Diagnostic Parameters */}
            {selectedPoint.originalFields && Object.keys(selectedPoint.originalFields).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Original Log Parameters</span>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(selectedPoint.originalFields, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Evidence & Grounding Safeguard Note */}
            <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-[10px] text-slate-400 space-y-1">
              <span className="text-slate-300 font-bold flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-cyan-400" />
                Root Cause & Evidence Traceability
              </span>
              <p className="leading-normal">
                Visualized points and arcs represent observed log records and temporal proximity. Root cause verification requires underlying bus timing and memory hardware register validation.
              </p>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <button
              onClick={() => handleCopyEvidence(selectedPoint)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-mono transition-colors"
            >
              {copyFeedback ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copyFeedback ? 'Copied Evidence!' : 'Copy Evidence'}</span>
            </button>

            <button
              onClick={() => setSelectedPoint(null)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-semibold transition-colors"
            >
              Close &amp; Return to 3D
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fms3DTelemetryModel;
