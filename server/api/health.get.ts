export default defineEventHandler(() => {
  return {
    status: "ok",
    service: "dailyaches-api",
    time: new Date().toISOString(),
  };
});
