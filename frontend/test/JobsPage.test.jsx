import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JobsPage from "../src/pages/JobsPage.jsx";
import { createTestQueryClient, renderWithProviders } from "./render.jsx";

const mockJobList = vi.fn();
const mockJobCreate = vi.fn();
const mockSearchCustom = vi.fn();
const mockResumeList = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockToast = vi.fn();

vi.mock("../src/services/api", () => ({
  jobApi: {
    list: (...args) => mockJobList(...args),
    create: (...args) => mockJobCreate(...args),
    searchCustom: (...args) => mockSearchCustom(...args),
    searchRecommended: vi.fn(() => Promise.resolve({ data: { jobs: [] } })),
  },
  aiAssistantApi: {
    analyzeJob: vi.fn(),
  },
  motivationsschreibenApi: {
    generate: vi.fn(),
  },
  resumeApi: {
    list: (...args) => mockResumeList(...args),
  },
  researchApi: {
    research: vi.fn(),
  },
}));

vi.mock("../src/hooks/useUsageGuard", () => ({
  default: () => ({
    guardedRun: (fn) => fn(),
  }),
}));

vi.mock("../src/components/PipelineStats", () => ({
  default: () => <div>PipelineStats</div>,
}));

vi.mock("../src/components/ApplicationsList", () => ({
  default: () => <div>ApplicationsList</div>,
}));

vi.mock("../src/components/ViennaMap", () => ({
  default: () => null,
}));

vi.mock("../src/components/CityMap", () => ({
  default: () => null,
}));

vi.mock("../src/components/ResearchModal", () => ({
  default: () => null,
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign((...args) => mockToast(...args), {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
  }),
}));

describe("JobsPage", () => {
  beforeEach(() => {
    mockJobList.mockReset();
    mockJobCreate.mockReset();
    mockSearchCustom.mockReset();
    mockResumeList.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
    mockToast.mockReset();
  });

  it("searches custom jobs and marks a saved result immediately", async () => {
    mockJobList.mockResolvedValue({ data: [] });
    mockResumeList.mockResolvedValue({ data: [] });
    mockSearchCustom.mockResolvedValue({
      data: {
        jobs: [
          {
            source_id: "job-1",
            title: "QA Engineer",
            company: "Acme",
            description: "Testing web apps",
            location: "Wien",
            updated: "2026-03-26T10:00:00.000Z",
            full_url: "https://example.com/job-1",
          },
        ],
      },
    });
    mockJobCreate.mockResolvedValue({ data: { id: 91 } });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["init"], {
      me: { email: "user@example.com", full_name: "Max Mustermann" },
      usage: [],
    });

    renderWithProviders(<JobsPage />, { queryClient });

    await userEvent.click(await screen.findByRole("button", { name: /Stellen finden/i }));
    await userEvent.click(screen.getByRole("button", { name: /Stellen suchen/i }));
    await userEvent.click(screen.getByRole("button", { name: /Eigene Suche/i }));

    await userEvent.type(screen.getByPlaceholderText("z.B. Verkauf, Gastro, IT, Praktikum"), "qa");
    await userEvent.type(screen.getByPlaceholderText("z.B. Wien, Graz, Linz, Salzburg"), "Wien");
    await userEvent.click(screen.getAllByRole("button", { name: /Stellen suchen/i }).at(-1));

    expect(await screen.findByText("QA Engineer")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /QA Engineer/ }));

    await userEvent.click(screen.getByRole("button", { name: "In Bewerbungen speichern" }));

    await waitFor(() => {
      expect(mockJobCreate).toHaveBeenCalledTimes(1);
    });

    expect(mockJobCreate.mock.calls[0][0]).toMatchObject({
      company: "Acme",
      role: "QA Engineer",
      url: "https://example.com/job-1",
    });
    expect(await screen.findByText("Gespeichert")).toBeInTheDocument();
    expect(mockSuccess).toHaveBeenCalledWith("Stelle gespeichert!");
  });
});
