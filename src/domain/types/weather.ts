export type WeatherType = "clear" | "rain" | "storm" | "fog" | "snow" | "heatwave";

export interface WeatherState {
  current: WeatherType;
  /** How many consecutive days the current weather has held — biases the transition roll toward changing. */
  daysInCurrentState: number;
}
