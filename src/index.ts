import { send, json, RequestHandler } from "micro";
import { router, get, post } from "microrouter";
import uuid from "uuid/v4";
import { CronJob } from "cron";
import timestring from "timestring";

const notfound: RequestHandler = (req, res) =>
  send(res, 404, "Not found route");

interface ScheduleParams {
  id?: string;
  runAt?: string;
  runIn?: string;
  url: string;
}

function assertIsScheduleParams(params: any): asserts params is ScheduleParams {
  if (!params.url) {
    throw new Error("/schedule requires `url` param");
  }
  if (!params.runAt && !params.runIn) {
    throw new Error("/schedule requires `runAt` or `runIn` param");
  }
}

const runAt = (whenToRun: string) => new Date(whenToRun);

const runIn = (whenToRun: string) => {
  const d = new Date();
  d.setSeconds(d.getSeconds() + timestring(whenToRun));
  return d;
};

const run = (time: Date, task: () => void) =>
  new CronJob(time, task, undefined, true);

const schedule: RequestHandler = async (req, res) => {
  const result = await json(req);
  assertIsScheduleParams(result);
  const id = result.id ?? uuid();
  const target = result.runAt ? runAt(result.runAt) : runIn(result.runIn!);
  run(target, () => {
    console.log(`calling ${result.url}`);
  });
  return send(res, 200, { id, target });
};

export = router(post("/schedule", schedule), get("/*", notfound));
