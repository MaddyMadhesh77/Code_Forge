import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/common/crypto/password.js";

/**
 * Seeds the development database.
 *
 * Everything here previously lived as hardcoded arrays inside the services, so
 * "data" was whatever the process happened to have in memory. Passwords are
 * hashed with the same function the auth flow uses — there is no separate
 * seeding path that could diverge from production behaviour.
 */
const prisma = new PrismaClient();

const DEV_PASSWORD = process.env.SEED_PASSWORD ?? "devpassword123";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_ALLOW_PRODUCTION) {
    throw new Error(
      "Refusing to seed a production database. Set SEED_ALLOW_PRODUCTION=1 to override.",
    );
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);

  const [candidate, interviewer, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "candidate@codeforge.dev" },
      create: {
        email: "candidate@codeforge.dev",
        displayName: "Casey Candidate",
        role: "CANDIDATE",
        passwordHash,
      },
      update: {},
    }),
    prisma.user.upsert({
      where: { email: "interviewer@codeforge.dev" },
      create: {
        email: "interviewer@codeforge.dev",
        displayName: "Ingrid Interviewer",
        role: "INTERVIEWER",
        passwordHash,
      },
      update: {},
    }),
    prisma.user.upsert({
      where: { email: "admin@codeforge.dev" },
      create: {
        email: "admin@codeforge.dev",
        displayName: "Avery Admin",
        role: "ADMIN",
        passwordHash,
      },
      update: {},
    }),
  ]);

  const twoSum = await prisma.problem.upsert({
    where: { slug: "two-sum" },
    create: {
      slug: "two-sum",
      title: "Two Sum",
      description:
        "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.",
      difficulty: "EASY",
      constraints: "2 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
      tags: ["arrays", "hash-map"],
      supportedLangs: ["python", "javascript", "cpp", "java"],
      isPublished: true,
      visibility: "PUBLIC",
      ownerId: interviewer.id,
      samples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "2 + 7 = 9" },
        { input: "nums = [3,2,4], target = 6", output: "[1,2]", explanation: "2 + 4 = 6" },
      ],
      hints: [
        "Start from a brute-force solution first.",
        "Look for a data structure that gives constant-time lookup.",
        "Validate with boundary inputs before optimizing.",
      ],
      editorial: "Use a hash map to reduce lookup from O(n) to O(1), giving an O(n) single pass.",
      starterCode: {
        python: "def two_sum(nums, target):\n    pass\n",
        javascript: "function twoSum(nums, target) {\n  // TODO\n}\n",
        cpp: "vector<int> twoSum(vector<int>& nums, int target) {\n  return {};\n}\n",
        java: "class Solution {\n  public int[] twoSum(int[] nums, int target) {\n    return new int[0];\n  }\n}\n",
      },
      referenceSolutions: {
        python:
          "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []\n",
        javascript:
          "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n",
      },
      testCases: {
        create: [
          { input: "[2,7,11,15]\n9", expected: "[0,1]", isHidden: false, ordinal: 0 },
          { input: "[3,2,4]\n6", expected: "[1,2]", isHidden: false, ordinal: 1 },
          { input: "[3,3]\n6", expected: "[0,1]", isHidden: true, ordinal: 2 },
        ],
      },
    },
    update: {},
  });

  await prisma.problem.upsert({
    where: { slug: "merge-intervals" },
    create: {
      slug: "merge-intervals",
      title: "Merge Intervals",
      description:
        "Given an array of `intervals`, merge all overlapping intervals and return the non-overlapping intervals that cover all the input.",
      difficulty: "MEDIUM",
      constraints: "1 <= intervals.length <= 10^4",
      tags: ["arrays", "sorting", "intervals"],
      supportedLangs: ["python", "javascript"],
      isPublished: true,
      visibility: "PUBLIC",
      ownerId: interviewer.id,
      samples: [
        {
          input: "[[1,3],[2,6],[8,10],[15,18]]",
          output: "[[1,6],[8,10],[15,18]]",
          explanation: "[1,3] and [2,6] overlap.",
        },
      ],
      hints: ["Sort by start, then sweep once merging as you go."],
      editorial: "Sort by start time, then merge in a single pass: O(n log n) overall.",
      starterCode: {
        python: "def merge(intervals):\n    pass\n",
        javascript: "function merge(intervals) {\n  // TODO\n}\n",
      },
      testCases: {
        create: [
          {
            input: "[[1,3],[2,6],[8,10],[15,18]]",
            expected: "[[1,6],[8,10],[15,18]]",
            isHidden: false,
            ordinal: 0,
          },
        ],
      },
    },
    update: {},
  });

  // A scheduled session so the dashboard has something to render.
  const existingSession = await prisma.interviewSession.findFirst({
    where: { title: "Seed: Two Sum screen" },
  });

  if (!existingSession) {
    await prisma.interviewSession.create({
      data: {
        title: "Seed: Two Sum screen",
        creatorId: interviewer.id,
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        role: "BACKEND",
        level: "MID",
        participants: {
          create: [
            { userId: interviewer.id, role: "INTERVIEWER" },
            { userId: candidate.id, role: "CANDIDATE" },
          ],
        },
        problems: { create: [{ problemId: twoSum.id, ordinal: 0 }] },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    [
      "Seed complete.",
      `  candidate@codeforge.dev   (CANDIDATE)   id=${candidate.id}`,
      `  interviewer@codeforge.dev (INTERVIEWER) id=${interviewer.id}`,
      `  admin@codeforge.dev       (ADMIN)       id=${admin.id}`,
      `  password: ${DEV_PASSWORD}`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
