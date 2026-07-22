import { describe, expect, it } from "vitest";

import {
  readOperatorCredentialConfig,
  verifyOperatorCredentials,
} from "./auth-credentials";

describe("readOperatorCredentialConfig", () => {
  it("returns the configured username and password", () => {
    const config = readOperatorCredentialConfig({
      OPERATOR_USERNAME: "operator",
      OPERATOR_PASSWORD: "s3cret",
    });
    expect(config).toEqual({ username: "operator", password: "s3cret" });
  });

  it("returns null when the username is missing", () => {
    const config = readOperatorCredentialConfig({
      OPERATOR_PASSWORD: "s3cret",
    });
    expect(config).toBeNull();
  });

  it("returns null when the password is missing", () => {
    const config = readOperatorCredentialConfig({
      OPERATOR_USERNAME: "operator",
    });
    expect(config).toBeNull();
  });

  it("returns null when a value is an empty string", () => {
    const config = readOperatorCredentialConfig({
      OPERATOR_USERNAME: "",
      OPERATOR_PASSWORD: "s3cret",
    });
    expect(config).toBeNull();
  });
});

describe("verifyOperatorCredentials", () => {
  const config = { username: "operator", password: "s3cret" };

  it("accepts an exact username and password match", () => {
    expect(
      verifyOperatorCredentials(
        { username: "operator", password: "s3cret" },
        config,
      ),
    ).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(
      verifyOperatorCredentials(
        { username: "operator", password: "wrong" },
        config,
      ),
    ).toBe(false);
  });

  it("rejects a wrong username", () => {
    expect(
      verifyOperatorCredentials(
        { username: "intruder", password: "s3cret" },
        config,
      ),
    ).toBe(false);
  });

  it("rejects when the config is null (unconfigured secret)", () => {
    expect(
      verifyOperatorCredentials(
        { username: "operator", password: "s3cret" },
        null,
      ),
    ).toBe(false);
  });

  it("rejects non-string submissions", () => {
    expect(
      verifyOperatorCredentials(
        { username: undefined, password: 123 },
        config,
      ),
    ).toBe(false);
  });

  it("rejects an empty submission against a real config", () => {
    expect(
      verifyOperatorCredentials({ username: "", password: "" }, config),
    ).toBe(false);
  });
});
