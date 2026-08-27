import fs from "node:fs";
import path from "node:path";

const file = path.resolve(process.cwd(), "src/data/initialTrip.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];

const byId = Object.fromEntries(data.activities.map((activity) => [activity.id, activity]));
const hotels = Object.fromEntries(data.hotels.map((hotel) => [hotel.city, hotel]));
const purchasesTotal = data.purchases
  .filter((purchase) => purchase.status === "Pagado")
  .reduce((sum, purchase) => sum + Number(purchase.amountCOP || 0), 0);

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(data.days.length === 19, `Expected 19 days, got ${data.days.length}`);
assert(data.days[0]?.date === "2026-12-23", "Trip must start on 2026-12-23");
assert(data.days[data.days.length - 1]?.date === "2027-01-10", "Trip must end on 2027-01-10");
assert(data.activities.some((a) => a.id === "d23-flight1"), "Missing Bogota-Mexico flight");
assert(data.activities.some((a) => a.id === "d24-flight2"), "Missing Mexico-Vancouver flight");
assert(data.activities.some((a) => a.id === "d24-zip21"), "Missing ZIPAIR outbound flight");
assert(data.activities.some((a) => a.id === "d9-flight"), "Missing ZIPAIR return flight");
assert(data.activities.some((a) => a.id === "d9-ac308"), "Missing Air Canada YVR-YUL flight");
assert(data.activities.some((a) => a.id === "d9-ac98"), "Missing Air Canada YUL-BOG flight");
assert(hotels.Osaka?.name === "Imperial Hotel Osaka", "Missing Imperial Hotel Osaka");
assert(hotels.Kyoto?.name === "Hotel Gran Ms Kyoto", "Missing Hotel Gran Ms Kyoto");
assert(hotels.Tokyo?.name === "Tokyu Stay Shimbashi", "Missing Tokyu Stay Shimbashi");
assert(hotels.Hakone?.name === "Ryokan por escoger", "Hakone must remain pending");
assert(hotels.Osaka?.paid === false && hotels.Kyoto?.paid === false && hotels.Tokyo?.paid === false, "Hotels must not be paid initially");
assert(byId["d3-church"]?.dayId === "2027-01-03", "Church must be on Sunday 2027-01-03");
assert(byId["d3-church"]?.start === "11:00", "Church must start at 11:00");
assert(byId["d3-church"]?.fixed === true, "Church must remain fixed");
assert(data.purchases.length === 1, `Expected exactly one initial purchase, got ${data.purchases.length}`);
assert(purchasesTotal === 9711421, `Expected paid total COP 9,711,421, got ${purchasesTotal}`);
assert(data.purchases[0]?.provider === "Aeroméxico + ZIPAIR + Air Canada", "Flight purchase provider mismatch");
assert(data.sources.some((source) => source.url.includes("tiktok.com") || source.url.includes("vt.tiktok.com")), "Missing TikTok sources");
assert(data.sources.some((source) => source.url.includes("instagram.com")), "Missing Instagram sources");
assert(data.library.length === 22, `Expected 22 library items, got ${data.library.length}`);
assert(data.costs.length === 21, `Expected 21 cost items, got ${data.costs.length}`);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      days: data.days.length,
      activities: data.activities.length,
      hotels: data.hotels.length,
      purchases: data.purchases.length,
      paidCOP: purchasesTotal,
      sources: data.sources.length,
      library: data.library.length,
    },
    null,
    2,
  ),
);
