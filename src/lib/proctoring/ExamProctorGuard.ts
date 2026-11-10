import { ViolationType } from '@/types/exam';

export interface ViolationReport {
  violationType: ViolationType;
  countsTowardStrike: boolean;
  description: string;
  clientTimestamp: string;
  metadata: Record<string, unknown>;
}

export interface ProctorConfig {
  submissionId: string;
  examId: string;
  maxStrikes: number;
  initialStrikes: number;
  enforceFullscreen: boolean;
  blockClipboard: boolean;
  onWarning: (
    currentStrikes: number,
    maxStrikes: number,
    violationType: ViolationType,
    reason: string,
    isFormalStrike: boolean
  ) => void;
  onFullscreenChange: (isFullscreen: boolean) => void;
  onAutoSubmit: (reason: string) => Promise<void>;
  getActiveQuestionId: () => string | null;
}

export class ExamProctorGuard {
  private config: ProctorConfig;
  private currentStrikes: number;
  private lastStrikeTimestamp = 0;
  private isDestroyed = false;
  private isSubmitting = false;

  // 1.5s deduplication cooldown prevents Alt+Tab from firing both visibilitychange + blur as 2 strikes
  private static readonly STRIKE_COOLDOWN_MS = 1500;

  constructor(config: ProctorConfig) {
    this.config = config;
    this.currentStrikes = config.initialStrikes;
  }

  public init(): void {
    document.documentElement.style.userSelect = 'none';
    document.documentElement.style.webkitUserSelect = 'none';

    document.addEventListener('contextmenu', this.handleContextMenu, true);
    document.addEventListener('copy', this.handleClipboard, true);
    document.addEventListener('cut', this.handleClipboard, true);
    document.addEventListener('paste', this.handleClipboard, true);
    document.addEventListener('dragstart', this.handleDragDrop, true);
    document.addEventListener('drop', this.handleDragDrop, true);
    document.addEventListener('selectstart', this.handleSelectStart, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('visibilitychange', this.handleVisibilityChange, true);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange, true);
    window.addEventListener('blur', this.handleWindowBlur, true);
  }

  public destroy(): void {
    this.isDestroyed = true;
    document.documentElement.style.userSelect = '';
    document.documentElement.style.webkitUserSelect = '';

    document.removeEventListener('contextmenu', this.handleContextMenu, true);
    document.removeEventListener('copy', this.handleClipboard, true);
    document.removeEventListener('cut', this.handleClipboard, true);
    document.removeEventListener('paste', this.handleClipboard, true);
    document.removeEventListener('dragstart', this.handleDragDrop, true);
    document.removeEventListener('drop', this.handleDragDrop, true);
    document.removeEventListener('selectstart', this.handleSelectStart, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange, true);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange, true);
    window.removeEventListener('blur', this.handleWindowBlur, true);
  }

  public async enterFullscreen(): Promise<boolean> {
    if (!this.config.enforceFullscreen) return true;
    try {
      const elem = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen({ navigationUI: 'hide' });
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      }
      this.config.onFullscreenChange(Boolean(document.fullscreenElement));
      return Boolean(document.fullscreenElement);
    } catch {
      // In embedded sandboxed iframes where browser blocks native fullscreen, notify caller gracefully
      return false;
    }
  }

  public async exitFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore exit errors
    }
  }

  /**
   * Public method to trigger or simulate a violation (used both by real browser listeners
   * and by the Proctoring Audit Simulator toolbar for testing in preview mode).
   */
  public async triggerViolation(
    violationType: ViolationType,
    isStrikeCandidate: boolean,
    humanMessage: string
  ): Promise<void> {
    await this.reportViolation(violationType, isStrikeCandidate, humanMessage);
  }

  private handleContextMenu = (e: MouseEvent): void => {
    if (!this.config.blockClipboard) return;
    e.preventDefault();
    e.stopPropagation();
    this.reportViolation(
      'CONTEXT_MENU',
      false,
      'Right-click context menu blocked inside the exam sandbox.'
    );
  };

  private handleSelectStart = (e: Event): void => {
    if (!this.config.blockClipboard) return;
    const target = e.target as HTMLElement | null;
    const isAnswerInput =
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement && target.type === 'text');

    if (!isAnswerInput) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private handleClipboard = (e: ClipboardEvent): void => {
    if (!this.config.blockClipboard) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.clipboardData) {
      e.clipboardData.clearData();
    }
    const type: ViolationType = e.type === 'paste' ? 'CLIPBOARD_PASTE' : 'CLIPBOARD_COPY';
    this.reportViolation(
      type,
      false,
      `Clipboard ${e.type.toUpperCase()} action was intercepted and blocked.`
    );
  };

  private handleDragDrop = (e: DragEvent): void => {
    if (!this.config.blockClipboard) return;
    e.preventDefault();
    e.stopPropagation();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    const isDevToolsShortcut =
      e.key === 'F12' || (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(key));

    if (isDevToolsShortcut) {
      e.preventDefault();
      e.stopPropagation();
      this.reportViolation(
        'DEVTOOLS_SUSPECTED',
        true,
        'Attempted to invoke browser Developer Tools shortcut.'
      );
      return;
    }

    if (!this.config.blockClipboard) return;

    const blockedModifierKeys = ['c', 'v', 'x', 'p', 's', 'f', 'u'];
    if (isCtrlOrCmd && blockedModifierKeys.includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      this.reportViolation(
        'SHORTCUT_BLOCKED',
        false,
        `Restricted keyboard shortcut (${e.metaKey ? 'Cmd' : 'Ctrl'}+${key.toUpperCase()}) blocked.`
      );
    }
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.reportViolation(
        'TAB_SWITCH',
        true,
        'Navigated away from the active exam browser tab (visibilityState: hidden).'
      );
    }
  };

  private handleWindowBlur = (): void => {
    if (document.visibilityState === 'hidden') return;
    this.reportViolation(
      'WINDOW_BLUR',
      true,
      'Exam browser window lost focus (Alt+Tab or secondary display click detected).'
    );
  };

  private handleFullscreenChange = (): void => {
    const isFullscreen = Boolean(document.fullscreenElement);
    this.config.onFullscreenChange(isFullscreen);

    if (this.config.enforceFullscreen && !isFullscreen && !this.isDestroyed && !this.isSubmitting) {
      this.reportViolation(
        'FULLSCREEN_EXIT',
        true,
        'Exited mandatory full-screen lock during active assessment.'
      );
    }
  };

  private async reportViolation(
    violationType: ViolationType,
    isStrikeCandidate: boolean,
    humanMessage: string
  ): Promise<void> {
    if (this.isDestroyed || this.isSubmitting) return;

    const now = Date.now();
    let countsTowardStrike = false;

    if (isStrikeCandidate) {
      if (now - this.lastStrikeTimestamp >= ExamProctorGuard.STRIKE_COOLDOWN_MS) {
        countsTowardStrike = true;
        this.lastStrikeTimestamp = now;
        this.currentStrikes += 1;
      }
    }

    const payload: ViolationReport = {
      violationType,
      countsTowardStrike,
      description: humanMessage,
      clientTimestamp: new Date(now).toISOString(),
      metadata: {
        activeQuestionId: this.config.getActiveQuestionId(),
        visibilityState: document.visibilityState,
        isFullscreen: Boolean(document.fullscreenElement),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    };

    if (countsTowardStrike && this.currentStrikes >= this.config.maxStrikes) {
      this.isSubmitting = true;
      await this.sendTelemetry(payload);
      await this.config.onAutoSubmit(
        `Maximum strike limit reached (${this.currentStrikes}/${this.config.maxStrikes}): ${humanMessage}`
      );
      return;
    }

    this.config.onWarning(
      this.currentStrikes,
      this.config.maxStrikes,
      violationType,
      humanMessage,
      countsTowardStrike
    );

    const serverRes = await this.sendTelemetry(payload);
    if (serverRes?.autoSubmitted && !this.isSubmitting) {
      this.isSubmitting = true;
      await this.config.onAutoSubmit('Exam auto-submitted by server proctoring authority.');
    }
  }

  private async sendTelemetry(
    payload: ViolationReport
  ): Promise<{ strikeCount: number; autoSubmitted: boolean } | null> {
    try {
      const res = await fetch(`/api/exams/${this.config.examId}/proctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: this.config.submissionId,
          ...payload,
        }),
        keepalive: true,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
