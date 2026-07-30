import type {
  Meeting,
  Motion,
  MotionCategory,
  MotionType,
  VoteTreshold,
} from './mettings';
import {
  MeetingStatusMap,
  MotionCategoryMap,
  MotionStatusMap,
  MotionTypeMap,
  VoteMethodMap,
  VoteTresholdMap,
} from './mettings';

/** 动议类型的元数据：决定提出条件与处理流程。 */
export interface MotionMeta {
  type: MotionType
  label: string
  category: MotionCategory
  /** 提出是否需要持有发言权 */
  needsFloor: boolean
  /** 是否需要附议 */
  needsSecond: boolean
  /** 是否可辩论 */
  debatable: boolean
  /** 表决阈值 */
  threshold: VoteTreshold
  /** 由主持人直接裁决，无需附议与投票 */
  chairRules: boolean
  /** 是否可叠加在当前动议之上（附属/优先/偶发动议） */
  stackable: boolean
  description: string
}

const { MAJORITY, TWO_THIRDS } = VoteTresholdMap;
const { MAIN, SUBSIDIARY, PRIVILEGED, INCIDENTAL } = MotionCategoryMap;

export const MOTION_META: Record<MotionType, MotionMeta> = {
  [MotionTypeMap.MAIN]: {
    type: MotionTypeMap.MAIN,
    label: '主动议',
    category: MAIN,
    needsFloor: true,
    needsSecond: true,
    debatable: true,
    threshold: MAJORITY,
    chairRules: false,
    stackable: false,
    description: '任何不属于其他分类的实质性的议题。',
  },
  [MotionTypeMap.LAY_ON_TABLE]: {
    type: MotionTypeMap.LAY_ON_TABLE,
    label: '搁置',
    category: SUBSIDIARY,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '将当前动议暂时搁置，以便处理更紧急的事务。',
  },
  [MotionTypeMap.PREVIOUS_QUESTION]: {
    type: MotionTypeMap.PREVIOUS_QUESTION,
    label: '立即表决',
    category: SUBSIDIARY,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: TWO_THIRDS,
    chairRules: false,
    stackable: true,
    description: '立即结束辩论并对当前动议进行表决。',
  },
  [MotionTypeMap.LIMIT_DEBATE]: {
    type: MotionTypeMap.LIMIT_DEBATE,
    label: '限制或延长辩论',
    category: SUBSIDIARY,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: TWO_THIRDS,
    chairRules: false,
    stackable: true,
    description: '限制辩论的次数或时长，或延长既定的辩论限制。',
  },
  [MotionTypeMap.POSTPONE_TO_TIME]: {
    type: MotionTypeMap.POSTPONE_TO_TIME,
    label: '有限期推迟',
    category: SUBSIDIARY,
    needsFloor: true,
    needsSecond: true,
    debatable: true,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '将当前动议推迟到指定时间再行审议。',
  },
  [MotionTypeMap.REFER_TO_COMMITTEE]: {
    type: MotionTypeMap.REFER_TO_COMMITTEE,
    label: '委托给委员会',
    category: SUBSIDIARY,
    needsFloor: true,
    needsSecond: true,
    debatable: true,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '将当前动议委托给委员会作进一步研究。',
  },
  [MotionTypeMap.AMEND]: {
    type: MotionTypeMap.AMEND,
    label: '修改',
    category: SUBSIDIARY,
    needsFloor: true,
    needsSecond: true,
    debatable: true,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '修改当前动议的内容。',
  },
  [MotionTypeMap.POSTPONE_INDEFINITELY]: {
    type: MotionTypeMap.POSTPONE_INDEFINITELY,
    label: '无限期推迟',
    category: SUBSIDIARY,
    needsFloor: true,
    needsSecond: true,
    debatable: true,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '从事实上否决该动议，且避免直接表决。',
  },
  [MotionTypeMap.ADJOURN]: {
    type: MotionTypeMap.ADJOURN,
    label: '休会',
    category: PRIVILEGED,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '结束本次会议。',
  },
  [MotionTypeMap.RECESS]: {
    type: MotionTypeMap.RECESS,
    label: '休息',
    category: PRIVILEGED,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '让所有人休息一段时间。',
  },
  [MotionTypeMap.QUESTION_OF_PRIVILEGE]: {
    type: MotionTypeMap.QUESTION_OF_PRIVILEGE,
    label: '提出特别议程',
    category: PRIVILEGED,
    needsFloor: false,
    needsSecond: false,
    debatable: false,
    threshold: MAJORITY,
    chairRules: true,
    stackable: true,
    description: '就重要事项请求主持人立即处理。',
  },
  [MotionTypeMap.ORDERS_OF_THE_DAY]: {
    type: MotionTypeMap.ORDERS_OF_THE_DAY,
    label: '请求遵守议程',
    category: PRIVILEGED,
    needsFloor: false,
    needsSecond: false,
    debatable: false,
    threshold: MAJORITY,
    chairRules: true,
    stackable: true,
    description: '要求会议回到既定议程。',
  },
  [MotionTypeMap.POINT_OF_ORDER]: {
    type: MotionTypeMap.POINT_OF_ORDER,
    label: '规则问题',
    category: INCIDENTAL,
    needsFloor: false,
    needsSecond: false,
    debatable: false,
    threshold: MAJORITY,
    chairRules: true,
    stackable: true,
    description: '指出会议进程违反了议事规则。',
  },
  [MotionTypeMap.APPEAL]: {
    type: MotionTypeMap.APPEAL,
    label: '申诉',
    category: INCIDENTAL,
    needsFloor: false,
    needsSecond: true,
    debatable: true,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '对主持人的裁决提出申诉，交付会议表决。',
  },
  [MotionTypeMap.SUSPEND_RULES]: {
    type: MotionTypeMap.SUSPEND_RULES,
    label: '暂停规则',
    category: INCIDENTAL,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: TWO_THIRDS,
    chairRules: false,
    stackable: true,
    description: '临时暂停一些议事规则以快速有效完成特定事项。',
  },
  [MotionTypeMap.DIVISION_OF_QUESTION]: {
    type: MotionTypeMap.DIVISION_OF_QUESTION,
    label: '拆分议题',
    category: INCIDENTAL,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '将包含多个部分的动议拆分为若干部分分别表决。',
  },
  [MotionTypeMap.METHOD_OF_VOTING]: {
    type: MotionTypeMap.METHOD_OF_VOTING,
    label: '确定表决方式',
    category: INCIDENTAL,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: MAJORITY,
    chairRules: false,
    stackable: true,
    description: '就某项表决应采用的方式作出决定。',
  },
  [MotionTypeMap.ORDER_OF_CONSIDERATION]: {
    type: MotionTypeMap.ORDER_OF_CONSIDERATION,
    label: '议题审议顺序',
    category: INCIDENTAL,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: TWO_THIRDS,
    chairRules: false,
    stackable: true,
    description: '变更议题的审议顺序',
  },
  [MotionTypeMap.RECONSIDER]: {
    type: MotionTypeMap.RECONSIDER,
    label: '重新审议',
    category: MAIN,
    needsFloor: true,
    needsSecond: true,
    debatable: true,
    threshold: MAJORITY,
    chairRules: false,
    stackable: false,
    description: '重新审议一项已表决的动议。',
  },
  [MotionTypeMap.RESCIND]: {
    type: MotionTypeMap.RESCIND,
    label: '撤销',
    category: MAIN,
    needsFloor: true,
    needsSecond: true,
    debatable: true,
    threshold: TWO_THIRDS,
    chairRules: false,
    stackable: false,
    description: '撤销此前通过的某项决定。',
  },
  [MotionTypeMap.TAKE_FROM_TABLE]: {
    type: MotionTypeMap.TAKE_FROM_TABLE,
    label: '恢复议题',
    category: MAIN,
    needsFloor: true,
    needsSecond: true,
    debatable: false,
    threshold: MAJORITY,
    chairRules: false,
    stackable: false,
    description: '将已搁置的动议重新提交会议审议。',
  },
};

export function motionMeta(type: MotionType): MotionMeta {
  return MOTION_META[type];
}

export const MOTION_CATEGORY_LABELS: Record<MotionCategory, string> = {
  [MotionCategoryMap.MAIN]: '主动议',
  [MotionCategoryMap.SUBSIDIARY]: '附属动议',
  [MotionCategoryMap.PRIVILEGED]: '优先动议',
  [MotionCategoryMap.INCIDENTAL]: '偶发动议',
};

export const MEETING_STATUS_LABELS: Record<number, string> = {
  [MeetingStatusMap.NOT_STARTED]: '未开始',
  [MeetingStatusMap.IN_PROGRESS]: '进行中',
  [MeetingStatusMap.VOTING]: '投票中',
  [MeetingStatusMap.RECESSED]: '休会',
  [MeetingStatusMap.ENDED]: '已结束',
};

export const MOTION_STATUS_LABELS: Record<number, string> = {
  [MotionStatusMap.DRAFT]: '待附议',
  [MotionStatusMap.PENDING]: '辩论中',
  [MotionStatusMap.LAID_ASIDE]: '已搁置',
  [MotionStatusMap.DISPOSED]: '已处理',
  [MotionStatusMap.VOTING]: '投票中',
};

export const VOTE_METHOD_LABELS: Record<number, string> = {
  [VoteMethodMap.UNANIMOUS]: '一致同意',
  [VoteMethodMap.VOICE]: '口头表决',
  [VoteMethodMap.SIGNED_BALLOT]: '记名投票',
  [VoteMethodMap.SECRET_BALLOT]: '不记名投票',
};

export interface Constraint {
  ok: boolean
  reason?: string
}

const allow: Constraint = { ok: true };
const deny = (reason: string): Constraint => ({ ok: false, reason });

/** 当前处于活动状态（未处理完毕）的动议栈，栈顶为最后提出者。 */
export function activeMotions(meeting: Meeting): Motion[] {
  return meeting.motions.filter(
    m => m.status !== MotionStatusMap.DISPOSED && m.status !== MotionStatusMap.LAID_ASIDE,
  );
}

export function topMotion(meeting: Meeting): Motion | null {
  const stack = activeMotions(meeting);
  return stack.length ? stack[stack.length - 1]! : null;
}

export function laidAsideMotions(meeting: Meeting): Motion[] {
  return meeting.motions.filter(m => m.status === MotionStatusMap.LAID_ASIDE);
}

export function isChair(meeting: Meeting, userId: string): boolean {
  return meeting.profile.chair === userId;
}

export function isMember(meeting: Meeting, userId: string): boolean {
  return meeting.members.includes(userId);
}

export function roleOf(meeting: Meeting, userId: string): 'host' | 'member' | 'observer' {
  if (isChair(meeting, userId))
    return 'host';
  if (isMember(meeting, userId))
    return 'member';
  return 'observer';
}

/** 记录模式解除所有操作限制。 */
function bypass(meeting: Meeting): boolean {
  return meeting.recordMode;
}

export function canGrabFloor(meeting: Meeting, userId: string): Constraint {
  if (bypass(meeting))
    return allow;
  if (!isMember(meeting, userId))
    return deny('旁听成员无法请求发言权');
  if (meeting.status === MeetingStatusMap.NOT_STARTED)
    return deny('会议尚未开始');
  if (meeting.status === MeetingStatusMap.VOTING)
    return deny('投票进行中');
  if (meeting.status !== MeetingStatusMap.IN_PROGRESS)
    return deny('会议当前不在讨论状态');
  if (meeting.floorHolder === userId)
    return deny('你已持有发言权');
  if (meeting.floorHolder)
    return deny('发言权被占用，等待发言结束');
  if (meeting.floorGrabAt != null && Date.now() < meeting.floorGrabAt)
    return deny('发言权即将开放，请稍候');
  return allow;
}

export function canEndFloor(meeting: Meeting, userId: string): Constraint {
  if (bypass(meeting) && meeting.floorHolder)
    return allow;
  if (meeting.floorHolder !== userId)
    return deny('你当前没有发言权');
  return allow;
}

export function canAssignFloor(meeting: Meeting, userId: string): Constraint {
  if (bypass(meeting))
    return allow;
  if (!isChair(meeting, userId))
    return deny('仅主持人可分配发言权');
  if (meeting.status !== MeetingStatusMap.IN_PROGRESS)
    return deny('会议当前不在讨论状态');
  return allow;
}

export function canProposeMotion(meeting: Meeting, userId: string, type: MotionType): Constraint {
  const meta = motionMeta(type);
  if (!bypass(meeting)) {
    if (!isMember(meeting, userId))
      return deny('旁听成员不能提出动议');
    if (meeting.status === MeetingStatusMap.NOT_STARTED)
      return deny('会议未开始');
    if (meeting.status === MeetingStatusMap.VOTING)
      return deny('有进行中的投票');
    if (meeting.status !== MeetingStatusMap.IN_PROGRESS)
      return deny('会议不在讨论状态');
    if (meta.needsFloor && meeting.floorHolder !== userId)
      return deny('需要持有发言权');
  }
  const stack = activeMotions(meeting);
  if (meta.stackable) {
    if (meta.category === SUBSIDIARY && !stack.length)
      return deny('当前没有待处理的动议，无法提出附属动议');
  } else if (stack.length) {
    return deny('已有待处理动议，请先处理完毕');
  }
  if (type === MotionTypeMap.TAKE_FROM_TABLE && !laidAsideMotions(meeting).length) {
    return deny('当前没有已搁置的动议');
  }
  return allow;
}

export function canSecondMotion(meeting: Meeting, userId: string, motion: Motion): Constraint {
  if (!bypass(meeting)) {
    if (!isMember(meeting, userId))
      return deny('旁听成员无法附议');
    if (meeting.status !== MeetingStatusMap.IN_PROGRESS)
      return deny('当前无法附议');
  }
  if (motion.status !== MotionStatusMap.DRAFT)
    return deny('该动议不在待附议状态');
  if (motion.proposer === userId)
    return deny('提出人不能附议自己的动议');
  if (motion.seconders.includes(userId))
    return deny('你已附议该动议');
  return allow;
}

export function canOpenVote(meeting: Meeting, userId: string, motion: Motion): Constraint {
  if (!bypass(meeting)) {
    if (!isChair(meeting, userId))
      return deny('仅主持人可发起表决');
    if (meeting.status !== MeetingStatusMap.IN_PROGRESS)
      return deny('当前无法发起表决');
  }
  if (motion.status !== MotionStatusMap.PENDING)
    return deny('动议需先获得足够附议');
  return allow;
}

export function canCastBallot(meeting: Meeting, userId: string): Constraint {
  if (!bypass(meeting)) {
    if (!isMember(meeting, userId))
      return deny('旁听成员无表决权');
  }
  if (!meeting.activeVote)
    return deny('当前没有进行中的投票');
  if (meeting.activeVote.ballots[userId] !== undefined)
    return deny('你已投过票');
  return allow;
}

export function canStartMeeting(meeting: Meeting, userId: string): Constraint {
  if (!isChair(meeting, userId))
    return deny('仅主持人可开启会议');
  if (meeting.status !== MeetingStatusMap.NOT_STARTED)
    return deny('会议已开始');
  return allow;
}

export function canEndMeeting(meeting: Meeting, userId: string): Constraint {
  if (!isChair(meeting, userId))
    return deny('仅主持人可结束会议');
  if (meeting.status === MeetingStatusMap.NOT_STARTED)
    return deny('会议尚未开始');
  if (meeting.status === MeetingStatusMap.ENDED)
    return deny('会议已结束');
  if (meeting.status === MeetingStatusMap.VOTING)
    return deny('投票进行中');
  return allow;
}

export function canResumeMeeting(meeting: Meeting, userId: string): Constraint {
  if (!isChair(meeting, userId))
    return deny('仅主持人可恢复会议');
  if (meeting.status !== MeetingStatusMap.RECESSED)
    return deny('会议不在休会状态');
  return allow;
}

export function canToggleRecordMode(meeting: Meeting, userId: string): Constraint {
  if (!isChair(meeting, userId))
    return deny('仅主持人可切换记录模式');
  return allow;
}

export function canEditAgenda(meeting: Meeting, userId: string): Constraint {
  if (bypass(meeting))
    return allow;
  if (!isChair(meeting, userId))
    return deny('仅主持人可管理议程');
  return allow;
}

export function canSwitchAgenda(meeting: Meeting, userId: string): Constraint {
  if (bypass(meeting))
    return allow;
  if (!isChair(meeting, userId))
    return deny('仅主持人可切换议题');
  if (meeting.status !== MeetingStatusMap.IN_PROGRESS)
    return deny('会议当前不在讨论状态');
  return allow;
}
