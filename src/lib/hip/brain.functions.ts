import { createServerFn } from "@tanstack/react-start";

import { BriefInput } from "./brain-schema";
import { runHospitalBrain } from "./brain.server";

export const hospitalBrain = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BriefInput.parse(input))
  .handler(async ({ data }) => runHospitalBrain(data));
