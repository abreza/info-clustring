import { useState, useEffect, useRef, useCallback } from "react";
import { WSNSimulationEngine } from "../service/simulation-engine";
import {
  AlgorithmType,
  SimulationConfig,
  SimulationResult,
  SimulationStats,
} from "../service/types";
import {
  DEFAULT_CONFIG,
  PLAYBACK_SPEED_DEFAULT,
  MAX_SIMULATION_ROUNDS,
} from "../constants";

export function useSimulation() {
  const [simulationEngine, setSimulationEngine] =
    useState<WSNSimulationEngine | null>(null);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoRun, setAutoRun] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(PLAYBACK_SPEED_DEFAULT);
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("kmeans");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const engine = new WSNSimulationEngine(config);
    setSimulationEngine(engine);
  }, [config]);

  useEffect(() => {
    if (simulationResult) {
      const maxRounds =
        simulationResult.algorithms[algorithm].history.length - 1;
      if (currentRound > maxRounds) {
        setCurrentRound(maxRounds);
      }
    }
  }, [algorithm, simulationResult, currentRound]);

  useEffect(() => {
    if (
      autoRun &&
      simulationEngine &&
      simulationResult &&
      isRunning &&
      !isPaused
    ) {
      intervalRef.current = setInterval(() => {
        setCurrentRound((prev) => {
          const maxRounds =
            simulationResult.algorithms[algorithm].history.length - 1;
          const nextRound = prev + 1;
          if (nextRound > maxRounds) {
            setIsRunning(false);
            return prev;
          }
          return nextRound;
        });
      }, playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    autoRun,
    simulationEngine,
    simulationResult,
    isRunning,
    isPaused,
    playbackSpeed,
    algorithm,
  ]);

  const startSimulation = useCallback(async () => {
    if (simulationEngine) {
      setIsLoading(true);
      try {
        setTimeout(() => {
          const result = simulationEngine.runSimulation(MAX_SIMULATION_ROUNDS);
          setSimulationResult(result);
          setCurrentRound(0);
          setIsRunning(true);
          setIsPaused(false);
          setIsLoading(false);
        }, 100);
      } catch (error) {
        console.error("Simulation error:", error);
        setIsLoading(false);
      }
    }
  }, [simulationEngine]);

  const pauseSimulation = useCallback(() => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  const stopSimulation = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentRound(0);
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulationResult(null);
    setCurrentRound(0);
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  const getCurrentStats = useCallback((): SimulationStats | null => {
    if (!simulationResult || !simulationEngine) return null;
    return simulationEngine.getStatsForRound(
      simulationResult,
      algorithm,
      currentRound
    );
  }, [simulationResult, simulationEngine, algorithm, currentRound]);

  const setCurrentRoundSafe = useCallback(
    (round: number) => {
      if (simulationResult) {
        const maxRounds =
          simulationResult.algorithms[algorithm].history.length - 1;
        const safeRound = Math.max(0, Math.min(round, maxRounds));
        setCurrentRound(safeRound);
      } else {
        setCurrentRound(round);
      }
    },
    [simulationResult, algorithm]
  );

  return {
    simulationEngine,
    simulationResult,
    currentRound,
    isRunning,
    isPaused,
    isLoading,
    autoRun,
    playbackSpeed,
    config,
    algorithm,

    startSimulation,
    pauseSimulation,
    stopSimulation,
    resetSimulation,
    setAutoRun,
    setPlaybackSpeed,
    setConfig,
    setAlgorithm,
    setCurrentRound: setCurrentRoundSafe,

    getCurrentStats,
  };
}
