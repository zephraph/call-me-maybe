declare module "timestring" {
  type ReturnPeriod = "ms" | "s" | "m" | "h" | "d" | "w" | "mth" | "y";
  export default function(timeString: string, period?: ReturnPeriod): number;
}
