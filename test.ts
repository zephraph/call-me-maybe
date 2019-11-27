import micro from "micro";
import request from "supertest";
import service from "./dist";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getServer = () => micro(service);
const get = (server = getServer()) => request(server).get("/");
const post = (server = getServer()) => request(server).post("/");
const del = (server = getServer(), queryParams?: string) =>
  request(server).delete(queryParams ? `/?${queryParams}` : "/");

test("GET returns empty array if no jobs are queued", () =>
  get().expect(200, []));

test("should post, get, and delete successfully", async () => {
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
  await del(server, "id=123").expect(200);
  await get(server).expect(200, []);
});
