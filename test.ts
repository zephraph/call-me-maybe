import micro from "micro";
import request from "supertest";
import service from "./dist";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getServer = () => micro(service);
const get = (server = getServer()) => request(server).get("/");
const post = (server = getServer()) => request(server).post("/");

test("GET returns empty array if no jobs are queued", () =>
  get().expect(200, []));

test("should return a job if one is queued", async () => {
  const server = getServer();
  await post(server)
    .send({ id: 123, runIn: "500 ms", url: "http://localhost" })
    .expect(200)
    .then(res => {
      expect(res.body).toMatchObject({ id: 123 });
      expect(res.body).toHaveProperty("target");
    });
  await get(server)
    .expect(200)
    .then(res => {
      expect(res.body[0]).toHaveProperty("123");
    });
});
