import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, renderPumlToSvg } from "@/lib/krokiRenderer";

describe("renderPumlToSvg", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns cached SVG responses on subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("<svg>ok</svg>"),
    });
    global.fetch = fetchMock as typeof global.fetch;

    const first = await renderPumlToSvg("diagram");
    const second = await renderPumlToSvg("diagram");

    expect(first).toEqual({ svg: "<svg>ok</svg>", fromCache: false });
    expect(second).toEqual({ svg: "<svg>ok</svg>", fromCache: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the Kroki response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("boom"),
    });
    global.fetch = fetchMock as typeof global.fetch;

    await expect(renderPumlToSvg("bad")).rejects.toThrow("Kroki error: 500 - boom");
  });

  it("clears cache so subsequent requests refetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("<svg>cached</svg>"),
    });
    global.fetch = fetchMock as typeof global.fetch;

    await renderPumlToSvg("diagram");
    clearCache();
    await renderPumlToSvg("diagram");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
