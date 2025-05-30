import { SimulationConfig, SensorData } from "../types";

export class EnvironmentModule {
  private config: SimulationConfig;
  private environmentState: Map<string, EnvironmentPoint>;
  private noiseGenerators: NoiseGenerator[];

  constructor(config: SimulationConfig) {
    this.config = config;
    this.environmentState = new Map();
    this.noiseGenerators = this.initializeNoiseGenerators();
    this.initializeEnvironment();
  }

  private initializeNoiseGenerators(): NoiseGenerator[] {
    return [
      new NoiseGenerator(0.01, 1.0, 1234),
      new NoiseGenerator(0.05, 0.5, 5678),
      new NoiseGenerator(0.1, 0.25, 9012),
    ];
  }

  private initializeEnvironment(): void {
    const gridSize = 20;
    const stepX = this.config.width / gridSize;
    const stepY = this.config.height / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = i * stepX;
        const y = j * stepY;
        const key = this.getGridKey(x, y);

        this.environmentState.set(key, this.generateBaseEnvironmentPoint(x, y));
      }
    }
  }

  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / (this.config.width / 20));
    const gridY = Math.floor(y / (this.config.height / 20));
    return `${gridX}_${gridY}`;
  }

  private generateBaseEnvironmentPoint(x: number, y: number): EnvironmentPoint {
    const normX = x / this.config.width;
    const normY = y / this.config.height;

    const depth = normY;

    const baseSalinity = this.lerp(
      this.config.minSalinity,
      this.config.maxSalinity,
      0.3 + 0.4 * Math.sin(normX * Math.PI * 2) + 0.3 * depth
    );

    const basePressure = this.lerp(
      this.config.minPressure,
      this.config.maxPressure,
      0.2 + 0.8 * depth + 0.1 * Math.cos(normX * Math.PI * 3)
    );

    const baseTemperature = this.lerp(
      this.config.minTemperature,
      this.config.maxTemperature,
      0.8 - 0.6 * depth + 0.2 * Math.sin(normX * Math.PI * 4)
    );

    const basePH = this.lerp(
      this.config.minPH,
      this.config.maxPH,
      0.5 + 0.3 * Math.cos(normX * Math.PI * 2) - 0.2 * depth
    );

    return {
      salinity: this.clamp(
        baseSalinity,
        this.config.minSalinity,
        this.config.maxSalinity
      ),
      pressure: this.clamp(
        basePressure,
        this.config.minPressure,
        this.config.maxPressure
      ),
      temperature: this.clamp(
        baseTemperature,
        this.config.minTemperature,
        this.config.maxTemperature
      ),
      ph: this.clamp(basePH, this.config.minPH, this.config.maxPH),
    };
  }

  public getSensorData(
    x: number,
    y: number,
    round: number
  ): Omit<SensorData, "id"> {
    const basePoint = this.getInterpolatedEnvironmentPoint(x, y);

    const timeVariation = this.getTemporalVariation(x, y, round);

    const noise = this.getNoise(x, y, round);

    const salinity = this.clamp(
      basePoint.salinity + timeVariation.salinity + noise.salinity,
      this.config.minSalinity,
      this.config.maxSalinity
    );

    const pressure = this.clamp(
      basePoint.pressure + timeVariation.pressure + noise.pressure,
      this.config.minPressure,
      this.config.maxPressure
    );

    const temperature = this.clamp(
      basePoint.temperature + timeVariation.temperature + noise.temperature,
      this.config.minTemperature,
      this.config.maxTemperature
    );

    const ph = this.clamp(
      basePoint.ph + timeVariation.ph + noise.ph,
      this.config.minPH,
      this.config.maxPH
    );

    return {
      salinity: parseFloat(salinity.toFixed(2)),
      pressure: parseFloat(pressure.toFixed(2)),
      temperature: parseFloat(temperature.toFixed(2)),
      ph: parseFloat(ph.toFixed(2)),
    };
  }

  private getInterpolatedEnvironmentPoint(
    x: number,
    y: number
  ): EnvironmentPoint {
    const gridSize = 20;
    const stepX = this.config.width / gridSize;
    const stepY = this.config.height / gridSize;

    const gridX = Math.floor(x / stepX);
    const gridY = Math.floor(y / stepY);

    const key = `${gridX}_${gridY}`;
    const point = this.environmentState.get(key);

    if (point) {
      return point;
    }

    return this.generateBaseEnvironmentPoint(x, y);
  }

  private getTemporalVariation(
    x: number,
    y: number,
    round: number
  ): EnvironmentPoint {
    const time = round * 0.01;
    const normX = x / this.config.width;
    const normY = y / this.config.height;

    const tidalCycle = Math.sin(time * 2 * Math.PI) * 0.5;
    const seasonalCycle = Math.cos(time * 0.1 * Math.PI) * 0.3;

    const salinityRange =
      (this.config.maxSalinity - this.config.minSalinity) * 0.05;
    const pressureRange =
      (this.config.maxPressure - this.config.minPressure) * 0.03;
    const temperatureRange =
      (this.config.maxTemperature - this.config.minTemperature) * 0.04;
    const phRange = (this.config.maxPH - this.config.minPH) * 0.02;

    return {
      salinity: salinityRange * (tidalCycle + seasonalCycle * normY),
      pressure: pressureRange * (tidalCycle * 1.5 + seasonalCycle * 0.5),
      temperature: temperatureRange * (seasonalCycle + tidalCycle * 0.3),
      ph: phRange * (seasonalCycle * 0.7 + tidalCycle * normX),
    };
  }

  private getNoise(x: number, y: number, round: number): EnvironmentPoint {
    let totalNoise = { salinity: 0, pressure: 0, temperature: 0, ph: 0 };

    for (const generator of this.noiseGenerators) {
      const noise = generator.getNoise(x, y, round);
      totalNoise.salinity += noise * 0.5;
      totalNoise.pressure += noise * 0.3;
      totalNoise.temperature += noise * 0.4;
      totalNoise.ph += noise * 0.2;
    }

    const salinityRange =
      (this.config.maxSalinity - this.config.minSalinity) * 0.02;
    const pressureRange =
      (this.config.maxPressure - this.config.minPressure) * 0.01;
    const temperatureRange =
      (this.config.maxTemperature - this.config.minTemperature) * 0.02;
    const phRange = (this.config.maxPH - this.config.minPH) * 0.01;

    return {
      salinity: totalNoise.salinity * salinityRange,
      pressure: totalNoise.pressure * pressureRange,
      temperature: totalNoise.temperature * temperatureRange,
      ph: totalNoise.ph * phRange,
    };
  }

  public updateEnvironment(): void {
    this.regenerateEnvironmentAreas();
  }

  private regenerateEnvironmentAreas(): void {
    const updateProbability = 0.05;

    for (const [key, point] of this.environmentState.entries()) {
      if (Math.random() < updateProbability) {
        const [gridX, gridY] = key.split("_").map(Number);
        const stepX = this.config.width / 20;
        const stepY = this.config.height / 20;
        const x = gridX * stepX;
        const y = gridY * stepY;

        const newPoint = this.generateBaseEnvironmentPoint(x, y);
        const blendFactor = 0.1;

        this.environmentState.set(key, {
          salinity: this.lerp(point.salinity, newPoint.salinity, blendFactor),
          pressure: this.lerp(point.pressure, newPoint.pressure, blendFactor),
          temperature: this.lerp(
            point.temperature,
            newPoint.temperature,
            blendFactor
          ),
          ph: this.lerp(point.ph, newPoint.ph, blendFactor),
        });
      }
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public getEnvironmentHeatmap(parameter: keyof EnvironmentPoint): number[][] {
    const resolution = 50;
    const heatmap: number[][] = [];

    for (let y = 0; y < resolution; y++) {
      const row: number[] = [];
      for (let x = 0; x < resolution; x++) {
        const worldX = (x / resolution) * this.config.width;
        const worldY = (y / resolution) * this.config.height;
        const point = this.getInterpolatedEnvironmentPoint(worldX, worldY);
        row.push(point[parameter]);
      }
      heatmap.push(row);
    }

    return heatmap;
  }
}

interface EnvironmentPoint {
  salinity: number;
  pressure: number;
  temperature: number;
  ph: number;
}

class NoiseGenerator {
  private frequency: number;
  private amplitude: number;
  private seed: number;

  constructor(frequency: number, amplitude: number, seed: number) {
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.seed = seed;
  }

  public getNoise(x: number, y: number, t: number): number {
    const value =
      Math.sin(x * this.frequency + this.seed) *
      Math.cos(y * this.frequency + this.seed * 1.5) *
      Math.sin(t * this.frequency * 0.1 + this.seed * 2);
    return value * this.amplitude;
  }
}
