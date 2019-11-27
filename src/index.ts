import { send, json, RequestHandler } from "micro";
import uuid from "uuid/v4";
import { CronJob } from "cron";
import timestring from "timestring";
import query from "micro-query";

let jobs: { [jobName: string]: CronJob } = {};

type ScheduleParams = { id?: string; url: string } & (
  | { runAt: string }
  | { runIn: string }
);

function assertIsScheduleParams(params: any): asserts params is ScheduleParams {
  if (!params.url) {
    throw new Error("Requires `url` param");
  }
  if (!params.runAt && !params.runIn) {
    throw new Error("Requires `runAt` or `runIn` param");
  }
}

const runAt = (whenToRun: string) => new Date(whenToRun);

const runIn = (whenToRun: string) => {
  const d = new Date();
  d.setSeconds(d.getSeconds() + timestring(whenToRun));
  return d;
};

const run = (id: string, time: Date, task: () => void) => {
  jobs[id]?.stop();
  jobs[id] = new CronJob(
    time,
    function(this: CronJob) {
      task();
      this.stop();
    },
    () => {
      if (jobs[id]) {
        delete jobs[id];
      }
    },
    true
  );
};

const schedule = (scheduleParams: object) => {
  assertIsScheduleParams(scheduleParams);
  const id = scheduleParams.id ?? uuid();
  const target =
    "runAt" in scheduleParams
      ? runAt(scheduleParams.runAt)
      : runIn(scheduleParams.runIn!);
  run(id, target, () => {
    console.log(`calling ${scheduleParams.url}`);
  });
  return { id, target };
};

function assertIsString(input: unknown): asserts input is string {
  if (typeof input !== "string") {
    throw new Error(`Expected a string, got ${typeof input} for ${input}`);
  }
}

const cancel = (id: unknown) => {
  assertIsString(id);
  jobs?.[id]?.stop();
};

const listJobs = () =>
  Object.entries(jobs).map(([id, job]) => ({ [id]: job.nextDate() }));

const requestHandler: RequestHandler = async (req, res) => {
  switch (req.method?.toUpperCase()) {
    case "POST":
      send(res, 200, schedule(await json(req)));
      break;
    case "DELETE":
      cancel(query<{ id: string }>(req).id);
      send(res, 200);
      break;
    case "GET":
      send(res, 200, listJobs());
      break;
    default:
      send(res, 404, "Method not supported");
  }
};

export default requestHandler;
