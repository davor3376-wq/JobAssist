import React, { useState } from "react";
import { screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplicationsList from "../src/components/ApplicationsList.jsx";
import { createTestQueryClient, renderWithProviders } from "./render.jsx";

const mockResumeList = vi.fn();
const mockDelete = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock("../src/services/api", () => ({
  resumeApi: {
    list: (...args) => mockResumeList(...args),
  },
  jobApi: {
    delete: (...args) => mockDelete(...args),
    updateStatus: vi.fn(),
    updateNotes: vi.fn(),
    updateDeadline: vi.fn(),
    updateUrl: vi.fn(),
    generateMatch: vi.fn(),
    generateCoverLetter: vi.fn(),
    generateInterviewPrep: vi.fn(),
    saveResearch: vi.fn(),
  },
  motivationsschreibenApi: {
    generate: vi.fn(),
  },
  researchApi: {
    research: vi.fn(),
  },
}));

vi.mock("../src/components/ResearchModal", () => ({
  default: () => null,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
  },
}));

function StatefulApplicationsList({ initialJobs }) {
  const [jobs, setJobs] = useState(initialJobs);
  return <ApplicationsList jobs={jobs} onJobsUpdate={setJobs} />;
}

describe("ApplicationsList", () => {
  beforeEach(() => {
    mockResumeList.mockReset();
    mockDelete.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
  });

  it("shows the no-resume hint and removes a job after delete", async () => {
    mockResumeList.mockResolvedValue({ data: [] });
    mockDelete.mockResolvedValue({ status: 204 });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["init"], {
      me: { email: "user@example.com", full_name: "Max Mustermann" },
    });

    renderWithProviders(
      <StatefulApplicationsList
        initialJobs={[
          {
            id: 1,
            role: "Frontend Engineer",
            company: "ACME",
            status: "bookmarked",
            description: "React role",
            created_at: "2026-03-26T10:00:00.000Z",
            updated_at: "2026-03-26T10:00:00.000Z",
          },
        ]}
      />,
      { queryClient },
    );

    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
    expect(
      screen.getByText("Für Match, Motivationsschreiben und Gesprächsvorbereitung brauchst du zuerst einen Lebenslauf."),
    ).toBeInTheDocument();

    const deleteTrigger = screen.getByTitle("Stelle löschen");
    await userEvent.click(within(deleteTrigger).getByRole("button"));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByText("Frontend Engineer")).not.toBeInTheDocument();
    });

    expect(mockSuccess).toHaveBeenCalledWith("Stelle entfernt");
  });
});
