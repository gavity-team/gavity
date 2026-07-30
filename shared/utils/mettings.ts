import * as z from 'zod';

export const VoteTresholdMap = {
  // OTHERS: 0, // @todo
  MAJORITY: 1,
  TWO_THIRDS: 2,
  UNANIMOUS: 3,
} as const;

export const VoteTreshold = z.enum(VoteTresholdMap);
export type VoteTreshold = z.infer<typeof VoteTreshold>;

export const VoteMethodMap = {
  UNANIMOUS: 0,
  VOICE: 1,
  SIGNED_BALLOT: 2,
  SECRET_BALLOT: 3,
} as const;

export const VoteMethod = z.enum(VoteMethodMap);
export type VoteMethod = z.infer<typeof VoteMethod>;

export const VoteResult = z.intersection(z.object({
  id: z.int(),
  threshold: VoteTreshold,
  voter: z.int(),
}), z.discriminatedUnion('method', [
  z.object({
    method: z.literal(VoteMethodMap.UNANIMOUS),
    passed: z.literal(true),
  }),
  z.object({
    method: z.literal(VoteMethodMap.VOICE),
    passed: z.boolean(),
  }),
  z.object({
    method: z.literal(VoteMethodMap.SIGNED_BALLOT),
    passed: z.boolean(),
    yea: z.string().array(),
    nay: z.string().array(),
    abstain: z.string().array(),
    invalid: z.string().array(),
  }),
  z.object({
    method: z.literal(VoteMethodMap.SECRET_BALLOT),
    passed: z.boolean(),
    yea: z.int(),
    nay: z.int(),
    abstain: z.int(),
    invalid: z.int(),
  }),
]));
export type VoteResult = z.infer<typeof VoteResult>;

export const MeetingStatusMap = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  VOTING: 2,
  RECESSED: 3,
  ENDED: 4,
} as const;

export const MeetingStatus = z.enum(MeetingStatusMap);
export type MeetingStatus = z.infer<typeof MeetingStatus>;

export const MotionCategoryMap = {
  MAIN: 0,
  SUBSIDIARY: 1,
  PRIVILEGED: 2,
  INCIDENTAL: 3,
} as const;

export const MotionCategory = z.enum(MotionCategoryMap);
export type MotionCategory = z.infer<typeof MotionCategory>;

export const MotionTypeMap = {
  // Main
  MAIN: 0,
  // Subsidiary
  LAY_ON_TABLE: 1,
  PREVIOUS_QUESTION: 2,
  LIMIT_DEBATE: 3,
  POSTPONE_TO_TIME: 4,
  REFER_TO_COMMITTEE: 5,
  AMEND: 6,
  POSTPONE_INDEFINITELY: 7,
  // Privileged
  ADJOURN: 8,
  RECESS: 9,
  QUESTION_OF_PRIVILEGE: 10,
  ORDERS_OF_THE_DAY: 11,
  // Incidental
  POINT_OF_ORDER: 12,
  APPEAL: 13,
  SUSPEND_RULES: 14,
  DIVISION_OF_QUESTION: 15,
  METHOD_OF_VOTING: 16,
  ORDER_OF_CONSIDERATION: 17,
  // Main (bring back)
  RECONSIDER: 18,
  RESCIND: 19,
  TAKE_FROM_TABLE: 20,
} as const;

export const MotionType = z.enum(MotionTypeMap);
export type MotionType = z.infer<typeof MotionType>;

export const MotionStatusMap = {
  /** Motion was made but not seconded. */
  DRAFT: 0,
  /** Motion was seconded and awaits a vote. */
  PENDING: 1,
  /** Motion was temporarily set aside. */
  LAID_ASIDE: 2,
  /** Motion was disposed of. */
  DISPOSED: 3,
  /** Vote on the motion is in progress. */
  VOTING: 4,
} as const;

export const MotionStatus = z.enum(MotionStatusMap);
export type MotionStatus = z.infer<typeof MotionStatus>;

export const Motion = z.object({
  id: z.int(),
  type: MotionType,
  content: z.string(),
  details: z.string(),
  status: MotionStatus,
  /** User id of the proposer. */
  proposer: z.string(),
  /** User ids of the seconders. */
  seconders: z.string().array(),
  /** Unix timestamp in milliseconds. */
  createdAt: z.int(),
  /** Id of the vote that disposed of the motion. */
  voteId: z.int().nullable(),
});
export type Motion = z.infer<typeof Motion>;

export const BallotMap = {
  YEA: 0,
  NAY: 1,
  ABSTAIN: 2,
} as const;

export const Ballot = z.enum(BallotMap);
export type Ballot = z.infer<typeof Ballot>;

/** A vote that is currently in progress. */
export const ActiveVote = z.object({
  id: z.int(),
  motionId: z.int(),
  threshold: VoteTreshold,
  method: VoteMethod,
  /** User id -> ballot. */
  ballots: z.record(z.string(), Ballot),
  /** Unix timestamp in milliseconds. */
  startedAt: z.int(),
});
export type ActiveVote = z.infer<typeof ActiveVote>;

export const AgendaItemStatusMap = {
  PENDING: 0,
  DISCUSSING: 1,
  PASSED: 2,
  REJECTED: 3,
} as const;

export const AgendaItemStatus = z.enum(AgendaItemStatusMap);
export type AgendaItemStatus = z.infer<typeof AgendaItemStatus>;

export const AgendaItem = z.object({
  id: z.int(),
  title: z.string(),
  details: z.string(),
  status: AgendaItemStatus,
  /** Optional scheduled start time (unix ms). */
  scheduledAt: z.int().nullable(),
  /** Whether this is a special agenda item (higher priority). */
  isSpecial: z.boolean(),
});
export type AgendaItem = z.infer<typeof AgendaItem>;

export const Meeting = z.object({
  schema: z.literal(1),
  id: z.int(),
  profile: z.object({
    title: z.string(),
    chair: z.string(),
  }),
  status: MeetingStatus,
  /** When enabled, all operation constraints are lifted. */
  recordMode: z.boolean(),
  /** Ids of members currently grabbing the floor (no queue, re-grab each round). */
  floor: z.string().array(),
  /** Id of the member currently holding the floor. */
  floorHolder: z.string().nullable(),
  /** Unix ms timestamp when floor grabbing opens (3s countdown after speech ends). */
  floorGrabAt: z.int().nullable(),
  members: z.string().array(),
  observers: z.string().array(),
  agenda: AgendaItem.array(),
  currentAgendaId: z.int().nullable(),
  motions: Motion.array(),
  votes: VoteResult.array(),
  activeVote: ActiveVote.nullable(),

  /** Unix timestamp in milliseconds. */
  startedAt: z.int().nullable(),
  /** Unix timestamp in milliseconds when the meeting ended. */
  endedAt: z.int().nullable(),
});
export type Meeting = z.infer<typeof Meeting>;
