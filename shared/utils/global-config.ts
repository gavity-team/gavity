import * as z from 'zod';

export const SupportedLanguage = z.enum(['zh-cn']);

export const SupportedRegexFlags = ['i', 'm', 's', 'u', 'v']; // g/y 有副作用，d 无影响
export function stringToRegex(x: string) {
  if (x[0] !== '/')
    throw new SyntaxError('Not started with slash');
  let patternEnd = x.length - 1;
  while (patternEnd > 0 && x[patternEnd] !== '/') {
    if (!SupportedRegexFlags.includes(x[patternEnd]!))
      throw new SyntaxError(`Unsupport flag: ${x[patternEnd]}`);
    --patternEnd;
  }
  if (patternEnd === 0)
    throw new SyntaxError('Not ended with slash and/or flags');
  return new RegExp(x.slice(1, patternEnd), x.slice(patternEnd + 1));
}

const StringifiedRegex = z.string().superRefine((x, ctx) => {
  try {
    stringToRegex(x);
  } catch (e) {
    ctx.addIssue({
      code: 'invalid_format',
      message: e instanceof Error ? e.message : String(e),
      path: [],
      input: x,
      format: 'stringified_regex',
    });
  }
});

export const GlobalConfig = z.object({
  defaultLanguage: SupportedLanguage,
  allowRegistration: z.boolean(),
  allowedUserEmailRegex: StringifiedRegex,
  smtpUrl: z.union([z.url(), z.literal('')]),
  defaultEmailSender: z.union([z.email(), z.literal('')]),
  verificationEmailSender: z.union([z.email(), z.literal('')]),
});
export type GlobalConfig = z.infer<typeof GlobalConfig>;
export type CustomGlobalConfig = {
  [P in keyof GlobalConfig]: GlobalConfig[P] | null
};

export const DefaultGlobalConfig: GlobalConfig = {
  defaultLanguage: 'zh-cn',
  allowRegistration: true,
  allowedUserEmailRegex: '/.*/',
  smtpUrl: '',
  defaultEmailSender: '',
  verificationEmailSender: '',
};
