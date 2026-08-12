"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Timer, Play, Lock } from "lucide-react";
import { GameEngine, TOTAL_ROUNDS, PACKAGES_PER_ROUND } from "./GameEngine";
import { PackageGenerator, DISTINCT_TRUCKS } from "./PackageGenerator";
import { ConveyorController } from "./ConveyorController";
import { WarehouseEngine } from "./WarehouseEngine";
import { AnimationController, type Particle, type FlyingPackage } from "./AnimationController";
import { PackageSorterSoundManager } from "./SoundManager";
import { scorePackageSorter } from "./ScoringEngine";
import { PackageSorterAnalyticsService } from "./AnalyticsService";
import type { Package, Truck, PackageSorterScores } from "./Types";
import "./Game.css";

export default function PackageSorterGame({
  disabled = false,
  sound = true,
  durationSeconds = 120,
  maxRounds = TOTAL_ROUNDS,
  onComplete,
}: {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  maxRounds?: number;
  onComplete: (metrics: PackageSorterScores) => void | Promise<void>;
}) {
  // Sub-system instances
  const [engine] = useState(() => new GameEngine());
  const [spawner] = useState(() => new PackageGenerator());
  const [conveyor] = useState(() => new ConveyorController());
  const [warehouse] = useState(() => new WarehouseEngine());
  const [animator] = useState(() => new AnimationController());
  const sounds = useRef<PackageSorterSoundManager | null>(null);
  const analytics = useRef(new PackageSorterAnalyticsService(onComplete));

  // Game state
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(1);
  const [correctInRound, setCorrectInRound] = useState(0);
  const [seconds, setSeconds] = useState(durationSeconds);
  const [packages, setPackages] = useState<Package[]>([]);
  const [flyingPackages, setFlyingPackages] = useState<FlyingPackage[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [successFlash, setSuccessFlash] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  const [bounceTruckId, setBounceTruckId] = useState<number | null>(null);
  const [shakeTruckId, setShakeTruckId] = useState<number | null>(null);

  // Selected package tracking (Stroop Selection mechanism)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Shake effect for locked packages
  const [shakePackageId, setShakePackageId] = useState<string | null>(null);

  // Round transition banner overlay state
  const [transitionBanner, setTransitionBanner] = useState<{ title: string; subtitle: string } | null>(null);

  // Refs for tracking lists to avoid stale closures and React Strict Mode double-updates
  const packagesRef = useRef<Package[]>([]);
  const flyingPackagesRef = useRef<FlyingPackage[]>([]);

  // Layout calculations
  const beltPath = useMemo(() => warehouse.getBeltPath(), [warehouse]);
  const truckPositions = useMemo(() => warehouse.getTruckPositions(4), [warehouse]);

  // Track packages that already triggered laser scanner sparks
  const scannedPackageIds = useRef<Set<string>>(new Set());

  // Game metrics tracker
  const metrics = useRef(engine.emptyMetrics());
  const finished = useRef(false);
  const lastSpawnTime = useRef(0);

  // Sync sounds enablement
  useEffect(() => {
    sounds.current = new PackageSorterSoundManager(sound);
    return () => sounds.current?.dispose();
  }, [sound]);

  // Sync analytics callback
  useEffect(() => {
    analytics.current = new PackageSorterAnalyticsService(onComplete);
  }, [onComplete]);

  // Complete game assessment
  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    const scores = scorePackageSorter(metrics.current, durationSeconds - seconds, durationSeconds);
    await analytics.current.save(scores);
  }, [durationSeconds, seconds]);

  // Game timer loop
  useEffect(() => {
    if (disabled || finished.current || !started || transitionBanner !== null) return;
    const timer = window.setInterval(() => {
      setSeconds((val) => Math.max(0, val - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [disabled, started, transitionBanner]);

  useEffect(() => {
    if (seconds === 0) {
      void finish();
    }
  }, [seconds, finish]);

  // Selection of Trucks configuration based on round difficulty
  const trucks = useMemo<Truck[]>(() => {
    return DISTINCT_TRUCKS;
  }, []);

  // Find the selected package helper
  const selectedPackage = useMemo(() => {
    return packagesRef.current.find((p) => p.id === selectedPackageId) || null;
  }, [selectedPackageId]);

  // Main animation frame game loop
  useEffect(() => {
    if (disabled || finished.current || !started) return;

    let frameId = 0;
    const speed = spawner.getConveyorSpeed(round);
    const spawnInterval = spawner.getSpawnInterval(round);

    const tick = () => {
      const now = Date.now();

      // If transition banner is showing, pause conveyor belt progress and spawning
      const isPaused = transitionBanner !== null;

      if (!isPaused) {
        // 1. Spawning packages
        if (now - lastSpawnTime.current >= spawnInterval) {
          if (packagesRef.current.length < 2 || round === 3) {
            lastSpawnTime.current = now;
            const newPkg = spawner.generate(round, trucks);
            packagesRef.current = [...packagesRef.current, newPkg];
            setPackages(packagesRef.current);
          }
        }

        // 2. Update conveyor packages progress
        const { updated, missedPackage } = conveyor.update(packagesRef.current, speed);
        packagesRef.current = updated;
        
        if (missedPackage) {
          sounds.current?.playFailure();
          setErrorFlash(true);
          setTimeout(() => setErrorFlash(false), 200);

          metrics.current.packagesSorted += 1;
          metrics.current.incorrectDeliveries += 1;
          metrics.current.decisionTimes.push(Date.now() - missedPackage.spawnTime);
          
          setSelectedPackageId((id) => (id === missedPackage.id ? null : id));
          packagesRef.current = packagesRef.current.filter((pkg) => pkg.id !== missedPackage.id);
        }

        // Trigger Laser barcode scan effect at progress = 45%
        packagesRef.current.forEach((pkg) => {
          if (pkg.progress >= 44 && pkg.progress <= 46 && !scannedPackageIds.current.has(pkg.id)) {
            scannedPackageIds.current.add(pkg.id);
            // Spawn bright red sparks along the laser line
            setParticles((parts) => {
              const xPos = beltPath.startX + (pkg.progress / 100) * (beltPath.endX - beltPath.startX);
              const list = [...parts];
              for (let i = 0; i < 8; i++) {
                list.push({
                  id: Math.random().toString(),
                  x: xPos,
                  y: beltPath.y - 15 + Math.random() * 30,
                  color: "#f43f5e",
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: (Math.random() - 0.5) * 1.5,
                  size: 3 + Math.random() * 3,
                  alpha: 1,
                });
              }
              return list;
            });
          }
        });
        
        setPackages(packagesRef.current);
      }

      // 3. Update particles
      setParticles((prev) => animator.updateParticles(prev));

      // 4. Update flying packages animations (can still run during transitions)
      const nextFlying: FlyingPackage[] = [];
      flyingPackagesRef.current.forEach((fp) => {
        const nextProgress = fp.progress + 0.08;
        if (nextProgress >= 1) {
          const targetTruck = trucks.find((t) => t.id === fp.targetTruckId);
          const isCorrect = targetTruck && targetTruck.icon === fp.icon;

          if (isCorrect) {
            sounds.current?.playSuccess();
            setSuccessFlash(true);
            setTimeout(() => setSuccessFlash(false), 150);

            // Burst particles + exhaust smoke puff + gold stars
            setParticles((parts) => [
              ...parts,
              ...animator.createSortingBurst(fp.targetX, fp.targetY - 5, targetTruck.hex),
              // Exhaust puff to the side of the truck
              {
                id: Math.random().toString(),
                x: fp.targetX - 7,
                y: fp.targetY + 4,
                color: "#4b5563",
                vx: -0.6,
                vy: -0.3,
                size: 9,
                alpha: 0.8,
              },
              {
                id: Math.random().toString(),
                x: fp.targetX - 8,
                y: fp.targetY + 2,
                color: "#6b7280",
                vx: -0.8,
                vy: -0.5,
                size: 12,
                alpha: 0.6,
              }
            ]);

            if (targetTruck) {
              setBounceTruckId(targetTruck.id);
              setTimeout(() => setBounceTruckId(null), 400);
            }

            metrics.current.correctDeliveries += 1;
            metrics.current.packagesSorted += 1;

            setCorrectInRound((c) => {
              const nextC = c + 1;
              const { nextRound, resetCounter } = engine.getNextRound(round, nextC);
              if (nextRound !== round) {
                if (round >= maxRounds) {
                  void finish();
                  return nextC;
                }
                setRound(nextRound);
                metrics.current.roundsPlayed = nextRound;
                metrics.current.highestDifficulty = Math.max(metrics.current.highestDifficulty, nextRound);
                
                // Trigger visual transition banner overlay
                setTransitionBanner({
                  title: `ROUND ${round} COMPLETE!`,
                  subtitle: `ROUND ${nextRound}: ${
                    nextRound === 2
                      ? "FASTER CONVEYOR!"
                      : nextRound === 3
                      ? "TWO MOVING PACKAGES!"
                      : "MATCH BY ICON (STROOP TEST)!"
                  }`
                });
                setTimeout(() => setTransitionBanner(null), 2000);

                setTimeout(() => sounds.current?.playTruckHorn(), 200);
                return 0;
              }
              return nextC;
            });
          } else {
            sounds.current?.playFailure();
            setErrorFlash(true);
            setTimeout(() => setErrorFlash(false), 200);

            if (targetTruck) {
              setShakeTruckId(targetTruck.id);
              setTimeout(() => setShakeTruckId(null), 400);
            }

            metrics.current.incorrectDeliveries += 1;
            metrics.current.packagesSorted += 1;
          }
        } else {
          const x = fp.x + (fp.targetX - fp.x) * 0.15;
          const y = fp.y + (fp.targetY - fp.y) * 0.15;
          nextFlying.push({
            ...fp,
            x,
            y,
            progress: nextProgress,
          });
        }
      });
      flyingPackagesRef.current = nextFlying;
      setFlyingPackages(nextFlying);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [disabled, round, started, trucks, spawner, conveyor, animator, engine, transitionBanner]);

  // Click handler to route package to specific truck
  const sortPackage = (pkg: Package, targetTruck: Truck) => {
    if (disabled || finished.current || transitionBanner !== null) return;

    // Enforce scanner validation: Packages can only be sorted AFTER crossing the laser line (progress >= 44)
    if (pkg.progress < 44) {
      sounds.current?.playFailure();
      setShakePackageId(pkg.id);
      setTimeout(() => setShakePackageId(null), 350);
      return;
    }

    sounds.current?.playSortClick();

    const startX = beltPath.startX + (pkg.progress / 100) * (beltPath.endX - beltPath.startX);
    const startY = beltPath.y;
    const targetPos = truckPositions[targetTruck.id];
    
    const decisionTime = Date.now() - pkg.spawnTime;

    const newFlying: FlyingPackage = {
      id: pkg.id,
      icon: pkg.icon,
      color: pkg.color,
      x: startX,
      y: startY,
      targetX: targetPos.x,
      targetY: targetPos.y,
      targetTruckId: targetTruck.id,
      progress: 0,
    };

    flyingPackagesRef.current = [...flyingPackagesRef.current, newFlying];
    setFlyingPackages(flyingPackagesRef.current);

    packagesRef.current = packagesRef.current.filter((p) => p.id !== pkg.id);
    setPackages(packagesRef.current);
    
    metrics.current.decisionTimes.push(decisionTime);
    setSelectedPackageId(null);
  };

  const getConveyorX = (progress: number) => {
    return `${beltPath.startX + (progress / 100) * (beltPath.endX - beltPath.startX)}%`;
  };

  if (!started) {
    return (
      <div className="ps-intro-screen">
        <div className="ps-warehouse-bg" />
        <div className="ps-warehouse-beams" />
        <div className="ps-intro-panel">
          <span className="ps-intro-icon-wrapper">📦</span>
          <h1 className="ps-intro-title">Package Sorter</h1>
          <p className="ps-intro-desc">
            Help sort packages on the conveyor belt. <strong>Wait for each package to pass the red laser scanner</strong>, tap to select it, then tap the correct truck to load it!
          </p>
          <button
            type="button"
            onClick={() => {
              lastSpawnTime.current = Date.now();
              setStarted(true);
            }}
            className="ps-intro-btn"
          >
            <Play className="h-4.5 w-4.5" /> START ASSESSMENT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-world" role="application" aria-label="Package Sorter cognitive assessment">
      <div className="ps-warehouse-bg" />
      <div className="ps-warehouse-beams" />
      <div className="ps-warehouse-truss" />
      <div className="ps-warning-stripes" />

      {/* Screen color flash overlays */}
      {successFlash && <div className="ps-success-flash" />}
      {errorFlash && <div className="ps-error-flash" />}

      {/* Round completed transitional banners */}
      {transitionBanner && (
        <div className="ps-transition-overlay">
          <div className="ps-transition-banner">
            <h2 className="ps-transition-title">{transitionBanner.title}</h2>
            <p className="ps-transition-sub">{transitionBanner.subtitle}</p>
          </div>
        </div>
      )}

      {/* HUD Bar */}
      <div className="ps-hud-container">
        <div className="ps-hud-card">
          <span className="ps-hud-title">Round</span>
          <span className="ps-hud-value">{round} of {TOTAL_ROUNDS}</span>
        </div>
        
        {/* Real-time check dots instead of a text card */}
        <div className="ps-progress-dots" aria-label={`${correctInRound} of ${PACKAGES_PER_ROUND} packages sorted in this round`}>
          {Array.from({ length: PACKAGES_PER_ROUND }).map((_, idx) => (
            <div
              key={idx}
              className={`ps-progress-dot ${idx < correctInRound ? "ps-dot-active" : ""}`}
            />
          ))}
        </div>

        <div className="ps-hud-card ps-hud-time">
          <span className="ps-hud-title">Time Left</span>
          <span className="ps-hud-value flex items-center gap-1.5">
            <Timer className="h-4.5 w-4.5 text-cyan-400" />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Conveyor Belt System */}
      <div className="ps-conveyor-system" style={{ top: `${beltPath.y}%` }}>
        <div className="ps-conveyor-belt-legs" />
        <div className="ps-conveyor-guardrail-top" />
        <div className="ps-conveyor-guardrail-bottom" />
        
        <div 
          className="ps-conveyor-belt-container"
          style={{ 
            "--belt-duration": `${2.5 / spawner.getConveyorSpeed(round)}s`
          } as React.CSSProperties}
        >
          <div className="ps-conveyor-belt-roller" />
          
          {/* Rotatable Gear wheels */}
          {[10, 30, 50, 70, 90].map((leftVal, idx) => (
            <div key={idx} className="ps-gear" style={{ left: `${leftVal}%` }}>
              <div 
                className="ps-gear-notch" 
                style={{ "--belt-duration": `${2.5 / spawner.getConveyorSpeed(round)}s` } as React.CSSProperties} 
              />
              <div 
                className="ps-gear-notch deg-90" 
                style={{ "--belt-duration": `${2.5 / spawner.getConveyorSpeed(round)}s` } as React.CSSProperties} 
              />
              <div className="ps-gear-cap" />
            </div>
          ))}
        </div>

        {/* Laser scanner lines */}
        <div className="ps-laser-scanner" />
        <div className="ps-laser-emitter-top" />
        <div className="ps-laser-emitter-bottom" />
      </div>

      {/* Packages rolling on the belt */}
      {packages.map((pkg) => {
        const isSelected = selectedPackageId === pkg.id;
        const isLocked = pkg.progress < 44;
        const isShaking = shakePackageId === pkg.id;

        return (
          <div key={pkg.id}>
            {/* Shadow of box on belt */}
            <div 
              className="ps-package-shadow" 
              style={{ left: getConveyorX(pkg.progress), top: `${beltPath.y}%` }} 
            />
            {/* Box item */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Enforce scanner validation before selecting
                if (isLocked) {
                  sounds.current?.playFailure();
                  setShakePackageId(pkg.id);
                  setTimeout(() => setShakePackageId(null), 350);
                  return;
                }
                setSelectedPackageId(isSelected ? null : pkg.id);
              }}
              className={`ps-package-item ${isSelected ? "ps-package-selected" : ""} ${isLocked ? "ps-package-locked" : ""} ${isShaking ? "ps-package-shake" : ""}`}
              style={{ left: getConveyorX(pkg.progress), top: `${beltPath.y}%` }}
              aria-label={`Select parcel ${pkg.name}`}
            >
              {/* Padlock icon displayed on locked packages */}
              {isLocked && (
                <div className="ps-package-lock-badge">
                  <Lock className="h-2.5 w-2.5 text-red-500" />
                </div>
              )}
              <div className="ps-package-sideflaps" />
              <div className={`ps-package-tape ps-tape-${pkg.color}`} />
              <span className="ps-package-icon">{pkg.icon}</span>
            </button>
          </div>
        );
      })}

      {/* Flying Packages (moving to truck) */}
      {flyingPackages.map((fp) => (
        <div 
          key={fp.id} 
          className="ps-flying-package"
          style={{ left: `${fp.x}%`, top: `${fp.y}%` }}
        >
          <div className="ps-package-sideflaps" />
          <div className={`ps-package-tape ps-tape-${fp.color}`} />
          <span className="ps-package-icon">{fp.icon}</span>
        </div>
      ))}

      {/* Burst Particles */}
      {particles.map((p) => (
        <div 
          key={p.id}
          className="ps-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.alpha,
          }}
        />
      ))}

      {/* Trucks (Bays at the bottom) */}
      <div className="ps-trucks-container">
        {trucks.map((truck) => {
          const isBouncing = bounceTruckId === truck.id;
          const isShaking = shakeTruckId === truck.id;
          const pos = truckPositions[truck.id];

          const nearestPackage = selectedPackage || (packagesRef.current.length > 0 ? packagesRef.current[0] : null);

          // Highlight target truck when a package is selected and matches
          const isSelectedTarget = selectedPackage && selectedPackage.icon === truck.icon;

          return (
            <button
              type="button"
              key={truck.id}
              onClick={() => {
                if (nearestPackage) {
                  sortPackage(nearestPackage, truck);
                }
              }}
              className={`ps-truck-bay ${isBouncing ? "ps-truck-bounce" : ""} ${isShaking ? "ps-truck-shake" : ""} ${isSelectedTarget ? "ps-truck-destination-highlight" : ""}`}
              style={{ 
                width: "22%",
                "--guide-color": truck.hex
              } as React.CSSProperties}
              aria-label={`Sort to ${truck.name}`}
            >
              {/* Directional beam light shined onto correct truck */}
              <div className={`ps-sorting-guide ${isSelectedTarget ? "ps-guide-active" : ""}`} />

              {/* Truck Vector Illustration */}
              <svg 
                viewBox="0 0 100 80" 
                className="ps-truck-body w-full h-auto"
                style={{ fill: truck.hex }}
              >
                {/* Truck Cargo Box with chrome highlights */}
                <rect x="5" y="10" width="60" height="45" rx="4" fill={truck.hex} />
                <rect x="8" y="13" width="54" height="39" rx="2" fill="rgba(0,0,0,0.18)" />
                <line x1="5" y1="52" x2="65" y2="52" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                
                {/* Truck Cab */}
                <path d="M65 18h18l12 17v20H65z" fill={truck.hex} />
                <path d="M68 21h12l8 11H68z" fill="#bae6fd" opacity="0.8" />
                
                {/* Wheels */}
                <circle cx="20" cy="62" r="10" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                <circle cx="20" cy="62" r="4" fill="#94a3b8" />
                <circle cx="72" cy="62" r="10" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                <circle cx="72" cy="62" r="4" fill="#94a3b8" />
                
                {/* Headlight */}
                <circle cx="92" cy="38" r="3.5" fill="#fef08a" />
                {/* Bumper */}
                <rect x="85" y="52" width="10" height="3" fill="#94a3b8" rx="1.5" />
              </svg>

              {/* Float matching icon inside cargo box */}
              <div 
                className="absolute text-4xl font-black z-30 select-none pointer-events-none" 
                style={{ top: "16%" }}
              >
                {truck.icon}
              </div>

              {/* Truck label card */}
              <div className="ps-truck-label-badge">
                {truck.name.replace(" Truck", "")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
