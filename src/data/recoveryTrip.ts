import part1 from "./recoveryTrip.parts/part1.jsonfrag?raw";
import part2 from "./recoveryTrip.parts/part2.jsonfrag?raw";
import part3 from "./recoveryTrip.parts/part3.jsonfrag?raw";

const recoveryTrip = JSON.parse([part1, part2, part3].join("\n"));

export default recoveryTrip;
