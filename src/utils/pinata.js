"server only";

import { PinataSDK } from "pinata";

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing ${name}`);
  }
  return String(value).trim();
}

export const pinata = new PinataSDK({
  pinataJwt: required("PINATA_JWT"),
  pinataGateway: required("NEXT_PUBLIC_GATEWAY_URL"),
});