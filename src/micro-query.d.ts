declare module "micro-query" {
  import { IncomingMessage } from "http";

  export default function<T extends object>(req: IncomingMessage): T;
}
