import { describe, expect, it } from "vitest";
import { estaForaDoExpediente } from "./expediente";

const configPadrao = {
  ativo: true,
  hora_inicio: "06:00:00",
  hora_fim: "22:00:00",
  timezone: "America/Sao_Paulo",
};

describe("Trava de horário de expediente (22:00 às 06:00)", () => {
  it("permite acesso às 06:00 no horário de Brasília", () => {
    expect(estaForaDoExpediente(configPadrao, new Date("2026-11-25T09:00:00Z"))).toBe(false);
  });

  it("permite acesso às 21:59 no horário de Brasília", () => {
    expect(estaForaDoExpediente(configPadrao, new Date("2026-11-26T00:59:00Z"))).toBe(false);
  });

  it("bloqueia acesso às 22:00 no horário de Brasília", () => {
    expect(estaForaDoExpediente(configPadrao, new Date("2026-11-26T01:00:00Z"))).toBe(true);
  });

  it("bloqueia acesso durante a madrugada (02:30 Brasília)", () => {
    expect(estaForaDoExpediente(configPadrao, new Date("2026-11-25T05:30:00Z"))).toBe(true);
  });

  it("bloqueia acesso às 05:59 no horário de Brasília", () => {
    expect(estaForaDoExpediente(configPadrao, new Date("2026-11-25T08:59:00Z"))).toBe(true);
  });

  it("libera acesso a qualquer hora quando a trava está desativada", () => {
    expect(
      estaForaDoExpediente({ ...configPadrao, ativo: false }, new Date("2026-11-26T02:00:00Z")),
    ).toBe(false);
  });
});