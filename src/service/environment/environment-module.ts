import { SimulationConfig, SensorData } from "../types";

const interpolate = (
  q11: number,
  q12: number,
  q21: number,
  q22: number,
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  x: number,
  y: number
): number => {
  if (x1 === x2 || y1 === y2) {
    return q11;
  }
  const x2x1 = x2 - x1;
  const y2y1 = y2 - y1;
  const x2x = x2 - x;
  const xx1 = x - x1;
  const y2y = y2 - y;
  const yy1 = y - y1;
  const f1 = (x2x / x2x1) * q11 + (xx1 / x2x1) * q21;
  const f2 = (x2x / x2x1) * q12 + (xx1 / x2x1) * q22;
  return (y2y / y2y1) * f1 + (yy1 / y2y1) * f2;
};

export class EnvironmentModule {
  private config: SimulationConfig;
  private gridResolution: number;
  private gridWidth: number;
  private gridHeight: number;

  private temperatureGrid: number[][];
  private salinityGrid: number[][];
  private pressureGrid: number[][];
  private phGrid: number[][];

  private readonly diffusionRate = 0.2;

  constructor(config: SimulationConfig) {
    this.config = config;

    this.gridResolution = 25;
    this.gridWidth = Math.ceil(this.config.width / this.gridResolution);
    this.gridHeight = Math.ceil(this.config.height / this.gridResolution);

    this.temperatureGrid = this.initializeGrid(
      "minTemperature",
      "maxTemperature"
    );
    this.salinityGrid = this.initializeGrid("minSalinity", "maxSalinity");
    this.pressureGrid = this.initializeGrid("minPressure", "maxPressure");
    this.phGrid = this.initializeGrid("minPH", "maxPH");
  }

  private initializeGrid(
    minKey: keyof SimulationConfig,
    maxKey: keyof SimulationConfig
  ): number[][] {
    let grid: number[][] = [];
    const min = this.config[minKey] as number;
    const max = this.config[maxKey] as number;

    for (let i = 0; i < this.gridHeight; i++) {
      grid[i] = [];
      for (let j = 0; j < this.gridWidth; j++) {
        grid[i][j] = min + Math.random() * (max - min);
      }
    }

    return grid;
  }

  public updateEnvironment(): void {
    this.temperatureGrid = this.applyAutomatonRule(this.temperatureGrid);
    this.salinityGrid = this.applyAutomatonRule(this.salinityGrid);
    this.pressureGrid = this.applyAutomatonRule(this.pressureGrid);
    this.phGrid = this.applyAutomatonRule(this.phGrid);

    this.addNoiseToGrid(
      this.temperatureGrid,
      "minTemperature",
      "maxTemperature"
    );
    this.addNoiseToGrid(this.salinityGrid, "minSalinity", "maxSalinity");
    this.addNoiseToGrid(this.pressureGrid, "minPressure", "maxPressure");
    this.addNoiseToGrid(this.phGrid, "minPH", "maxPH");
  }

  private applyAutomatonRule(grid: number[][]): number[][] {
    const newGrid: number[][] = grid.map((row) => [...row]);

    for (let i = 0; i < this.gridHeight; i++) {
      for (let j = 0; j < this.gridWidth; j++) {
        let neighborSum = 0;
        let neighborCount = 0;

        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue;
            const ni = i + di;
            const nj = j + dj;

            if (
              ni >= 0 &&
              ni < this.gridHeight &&
              nj >= 0 &&
              nj < this.gridWidth
            ) {
              neighborSum += grid[ni][nj];
              neighborCount++;
            }
          }
        }

        const averageOfNeighbors =
          neighborCount > 0 ? neighborSum / neighborCount : grid[i][j];
        const currentValue = grid[i][j];

        newGrid[i][j] =
          (1 - this.diffusionRate) * currentValue +
          this.diffusionRate * averageOfNeighbors;
      }
    }
    return newGrid;
  }

  private addNoiseToGrid(
    grid: number[][],
    minKey: keyof SimulationConfig,
    maxKey: keyof SimulationConfig
  ): void {
    const min = this.config[minKey] as number;
    const max = this.config[maxKey] as number;
    const range = max - min;

    const noiseMagnitude = 0.03 * range;

    for (let i = 0; i < this.gridHeight; i++) {
      for (let j = 0; j < this.gridWidth; j++) {
        const randomNoise = (Math.random() - 0.5) * noiseMagnitude;
        const newValue = grid[i][j] + randomNoise;

        grid[i][j] = Math.max(min, Math.min(max, newValue));
      }
    }
  }

  public getSensorData(
    x: number,
    y: number,
    t: number
  ): Omit<SensorData, "id"> {
    const gridX = x / this.gridResolution;
    const gridY = y / this.gridResolution;

    return {
      temperature: this.getValueFromGrid(this.temperatureGrid, gridX, gridY),
      salinity: this.getValueFromGrid(this.salinityGrid, gridX, gridY),
      pressure: this.getValueFromGrid(this.pressureGrid, gridX, gridY),
      ph: this.getValueFromGrid(this.phGrid, gridX, gridY),
    };
  }

  private getValueFromGrid(grid: number[][], x: number, y: number): number {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, this.gridWidth - 1);
    const y2 = Math.min(y1 + 1, this.gridHeight - 1);

    const safeX1 = Math.max(0, x1);
    const safeY1 = Math.max(0, y1);

    const q11 = grid[safeY1][safeX1];
    const q12 = grid[y2][safeX1];
    const q21 = grid[safeY1][x2];
    const q22 = grid[y2][x2];

    return interpolate(q11, q12, q21, q22, x1, x2, y1, y2, x, y);
  }

  public getConfig(): SimulationConfig {
    return this.config;
  }

  public getGrids() {
    return {
      temperature: this.temperatureGrid,
      salinity: this.salinityGrid,
      pressure: this.pressureGrid,
      ph: this.phGrid,
    };
  }
}
