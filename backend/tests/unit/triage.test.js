// Unit tests for the deterministic AI-triage heuristic (the offline fallback
// that also seeds the demo). Pure functions — fast, no DB, no network.
const { heuristicTriage, bandFor } = require("../../src/services/triage");

describe("bandFor()", () => {
  it("maps scores to the documented urgency bands", () => {
    expect(bandFor(95)).toBe("critical"); // >= 85
    expect(bandFor(85)).toBe("critical");
    expect(bandFor(70)).toBe("urgent"); // 60-84
    expect(bandFor(45)).toBe("standard"); // 30-59
    expect(bandFor(10)).toBe("low"); // < 30
  });
});

describe("heuristicTriage()", () => {
  it("returns a bounded score, matching band, and a summary", () => {
    const out = heuristicTriage({ request_type: "food", description: "Need groceries", affected_count: 1 });
    expect(out.priority_score).toBeGreaterThanOrEqual(0);
    expect(out.priority_score).toBeLessThanOrEqual(100);
    expect(out.ai_category).toBe(bandFor(out.priority_score));
    expect(typeof out.ai_summary).toBe("string");
    expect(out.ai_source).toBe("heuristic");
  });

  it("scores a life-threatening medical description as critical", () => {
    const out = heuristicTriage({
      request_type: "medical",
      description: "Neighbour is unconscious and not breathing, possible cardiac arrest",
      affected_count: 1,
    });
    expect(out.priority_score).toBeGreaterThanOrEqual(85);
    expect(out.ai_category).toBe("critical");
  });

  it("scores a purely informational request as low", () => {
    const out = heuristicTriage({
      request_type: "information",
      description: "Where can I find general updates?",
      affected_count: 1,
    });
    expect(out.priority_score).toBeLessThan(30);
    expect(out.ai_category).toBe("low");
  });

  it("ranks an urgent medical need above a routine food request", () => {
    const medical = heuristicTriage({ request_type: "medical", description: "elderly diabetic needs insulin", affected_count: 1 });
    const food = heuristicTriage({ request_type: "food", description: "would like some canned food", affected_count: 1 });
    expect(medical.priority_score).toBeGreaterThan(food.priority_score);
  });

  it("nudges the score up when more people are affected", () => {
    const one = heuristicTriage({ request_type: "shelter", description: "need shelter", affected_count: 1 });
    const many = heuristicTriage({ request_type: "shelter", description: "need shelter", affected_count: 6 });
    expect(many.priority_score).toBeGreaterThan(one.priority_score);
  });

  it("never throws on empty/missing input", () => {
    expect(() => heuristicTriage({})).not.toThrow();
    const out = heuristicTriage({});
    expect(out.ai_summary).toBe("No description provided.");
  });
});
