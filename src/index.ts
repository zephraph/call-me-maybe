import { send, json, RequestHandler } from "micro";
import uuid from "uuid/v4";
import { CronJob } from "cron";
import timestring from "timestring";
import query from "micro-query";

let jobs: { [jobName: string]: CronJob } = {};

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

const run = (id: string, time: Date, task: () => void) => {
  jobs[id]?.stop();
  jobs[id] = new CronJob(
    time,
    function(this: CronJob) {
      task();
      this.stop();
    },
    () => {
      console.log("stopping...");
      if (jobs[id]) {
        console.log("Ending job timeout:", jobs[id].lastDate());
        delete jobs[id];
      }
    },
    true
  );
  console.log("New job timeout:", jobs[id].nextDate());
};

const schedule = (scheduleParams: object) => {
  assertIsScheduleParams(scheduleParams);
  const id = scheduleParams.id ?? uuid();
  const target = scheduleParams.runAt
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

const requestHandler: RequestHandler = async (req, res) => {
  switch (req.method?.toUpperCase()) {
    case "POST":
      const addedJob = schedule(await json(req));
      send(res, 200, addedJob);
      break;
    case "DELETE":
      const { id } = query(req);
      cancel(id);
      send(res, 200);
      break;
    case "GET":
      send(
        res,
        200,
        Object.entries(jobs).map(([id, job]) => ({ [id]: job.nextDate() }))
      );
      break;
    default:
      send(res, 404, "Method not supported");
  }
};

exports = requestHandler;
