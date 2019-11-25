import { send, json, RequestHandler } from "micro";
import { router, get, post, put } from "microrouter";
import uuid from "uuid/v4";
import { CronJob } from "cron";
import timestring from "timestring";
import query from "micro-query";

let jobs: { [jobName: string]: CronJob } = {};

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

const schedule: RequestHandler = async (req, res) => {
  const result = await json(req);
  assertIsScheduleParams(result);
  const id = result.id ?? uuid();
  const target = result.runAt ? runAt(result.runAt) : runIn(result.runIn!);
  const newJob = run(id, target, () => {
    console.log(`calling ${result.url}`);
  });
  return send(res, 200, { id, target });
};

const cancel: RequestHandler = async (req, res) => {
  const { id } = query(req);
  jobs[id]?.stop();
};

export = router(
  put("/cancel/:id", cancel),
  post("/schedule", schedule),
  get("/*", notfound)
);
