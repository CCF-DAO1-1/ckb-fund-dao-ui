'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { usePathname } from 'next/navigation';
import enMessages from '../locales/en.json';
import zhMessages from '../locales/zh.json';

import { logger } from '@/lib/logger';
type Locale = 'en' | 'zh';

interface Messages {
  common: {
    getStarted: string;
    saveAndSee: string;
    deployNow: string;
    readDocs: string;
    learn: string;
    examples: string;
    goToNextjs: string;
    backToHome: string;
    viewDetails: string;
  };
  errors: {
    noPermission: string;
    noPermissionMessage: string;
  };
  navigation: {
    home: string;
    about: string;
    contact: string;
    userCenter?: string;
  };
  taskModal: {
    title: string;
    proposalInfo: string;
    taskInfo: string;
    taskType: string;
    deadline: string;
    meetingTime: string;
    meetingLink: string;
    remarks: string;
    meetingMinutes: string;
    milestoneAmount: string;
    milestoneDescription: string;
    verificationResult: string;
    verificationNotes: string;
    rectificationStatus: string;
    rectificationNotes: string;
    recoveryAmount: string;
    recoveryReason: string;
    projectSummary: string;
    finalReport: string;
    voteType: string;
    voteDuration: string;
    customVoteTime: string;
    voteStartTime: string;
    voteEndTime: string;
    timePreview: {
      startTime: string;
      endTime: string;
    };
    voteTypes: {
      communityReview: string;
      formal: string;
      milestone: string;
    };
    durations: {
      "1day": string;
      "3days": string;
      "7days": string;
      "14days": string;
    };
    verificationResults: {
      pass: string;
      fail: string;
      needRectification: string;
    };
    rectificationStatuses: {
      completed: string;
      inProgress: string;
      notStarted: string;
    };
    buttons: {
      complete: string;
      cancel: string;
      process: string;
      createVote: string;
    };
    placeholders: {
      selectDate: string;
      selectVoteStartTime: string;
      selectVoteEndTime: string;
      enterMeetingLink: string;
      enterRemarks: string;
      enterMeetingMinutes: string;
      enterAmount: string;
      enterDescription: string;
      enterNotes: string;
      enterReason: string;
      enterSummary: string;
      enterReport: string;
      enterFinalReport: string;
      selectMeetingTime: string;
      enterAllocationAmount: string;
      enterAllocationDescription: string;
      selectVerificationResult: string;
      enterVerificationNotes: string;
      selectRectificationStatus: string;
      enterRectificationNotes: string;
      enterRecoveryAmount: string;
      enterRecoveryReason: string;
      enterProjectSummary: string;
    };
    errors: {
      insufficientPermissions: string;
      systemError: string;
      userNotLoggedIn: string;
      signatureFailed: string;
      createVoteFailed: string;
    };
    required: string;
  };
  management: {
    title: string;
    proposalManagement: string;
    filterByStatus: string;
    allStatuses: string;
    draft: string;
    review: string;
    vote: string;
    milestone: string;
    approved: string;
    rejected: string;
    ended: string;
    proposalTitle: string;
    applicant: string;
    budget: string;
    status: string;
    deadline: string;
    actions: string;
    noData: string;
  };
  header: {
    governanceHome: string;
    treasury: string;
    propertyInfo: string;
    userCenter: string;
    governanceRules: string;
    createProposal: string;
    login: string;
  };
  taskTypes: {
    organizeMeeting: string;
    organizeAMA: string;
    publishMinutes: string;
    milestoneAllocation: string;
    milestoneVerification: string;
    projectRectification: string;
    recoverFunds: string;
    publishReport: string;
    submitReexamineReport: string;
    initiationVote: string;
    milestoneVoteTask: string;
    delayVoteTask: string;
    reviewVoteTask: string;
    reexamineVote: string;
    rectificationVote: string;
    submitRectificationReport: string;
    createVote: string;
  };
  proposalStatus: {
    draft: string;
    communityReview: string;
    voting: string;
    milestoneDelivery: string;
    approved: string;
    rejected: string;
    ended: string;
    unknown: string;
    initiationVote: string;
    waitingForStartFund: string;
    inProgress: string;
    milestoneVote: string;
    delayVote: string;
    waitingForMilestoneFund: string;
    waitingForAcceptanceReport: string;
    completed: string;
    waitingReexamine: string;
    waitingRectification: string;
    rectificationVote: string;
    reexamineVote: string;
  };
  proposalInfo: {
    proposalName: string;
    proposalId: string;
    proposalType: string;
    proposalPhase: string;
    budget: string;
    proposalUri: string;
    unknownProposal: string;
    unknownId: string;
    unknownType: string;
    unknownStatus: string;
    unknownBudget: string;
    unknownUri: string;
    pending: string;
  };
  formLabels: {
    meetingTime: string;
    meetingLink: string;
    meetingMinutes: string;
    allocationAmount: string;
    allocationDescription: string;
    verificationResult: string;
    verificationNotes: string;
    rectificationStatus: string;
    rectificationNotes: string;
    recoveryAmount: string;
    recoveryReason: string;
    projectSummary: string;
    finalReport: string;
  };
  editor: {
    loading: string;
    uploading: string;
    uploadSuccess: string;
    uploadFailed: string;
  };
  alerts: {
    selectVoteTime: string;
    createVoteFailed: string;
  };
  managementPage: {
    title: string;
    description: string;
    futureDescription: string;
    daoManager: string;
    positionMission: string;
    positionMissionDesc: string;
    coreResponsibilities: string;
    coreResponsibilitiesDesc: string;
    proposalLifecycle: string;
    proposalGuidance: string;
    communityInquiry: string;
    supervisionReporting: string;
    milestoneVerification: string;
    verificationReport: string;
    transparencyCommunication: string;
    treasuryTransparency: string;
    informationReach: string;
    powerBoundaries: string;
    powerBoundariesDesc: string;
    noDecisionRights: string;
    noInterpretationRights: string;
    fundResponsibilities: string;
    budgetAllocation: string;
    milestonePayment: string;
    votingRights: string;
  };
  managementCenter: {
    newProposals: string;
    all: string;
    organizeAMA: string;
    milestoneReview: string;
    pendingAllocation: string;
    pendingCompletion: string;
    searchProposals: string;
    loading: string;
    loadFailed: string;
    retry: string;
    type: string;
    taskType: string;
    budget: string;
    deadline: string;
    actions: string;
    process: string;
    createVote: string;
  };
  wallet: {
    gettingAddress: string;
    notConnected: string;
    gettingBalance: string;
    bindSuccessMessage: string;
    stakeCKB: string;
    bindNeuronWallet: string;
    bindNewWallet: string;
    signatureInfo: string;
    bindSuccessTitle: string;
    invalidHexSignature: string;
    signatureConversionFailed: string;
    signerNotConnected: string;
    bindInfoNotGenerated: string;
    title: string;
    myVotingPower: string;
    votingPowerExplanation: string;
    loading: string;
    currentConnectedWallet: string;
    walletBalance: string;
  };
  voteWeight: {
    noCKBAddress: string;
    getVoteWeightFailed: string;
    responseDataError: string;
    emptyCKBAddress: string;
    formatError: string;
    votes: string;
  };
  voteMeta: {
    createVoteMetaFailed: string;
    userSignKeyNotExists: string;
    signatureGenerationFailed: string;
    createVoteMetaError: string;
    communityReviewVote: string;
    threeDaysLater: string;
  };
  voting: {
    errors: {
      prepareFailed: string;
      submitFailedEmptyResponse: string;
      submitFailedRetry: string;
      submitFailedInvalidFormat: string;
      missingProof: string;
      missingTxHash: string;
      buildTransactionFailed: string;
      getVoteDetailFailed: string;
      getVoteStatusFailed: string;
      queryVoteStatusFailed: string;
      updateTxHashFailed: string;
      voteFailed: string;
      userNotLoggedIn: string;
    };
    logs: {
      prepareSuccess: string;
      prepareFailed: string;
      buildTransactionFailed: string;
      txHash: string;
      milestoneVotePrepareSuccess: string;
      milestoneVotePrepareFailed: string;
    };
    options: {
      approve: string;
      reject: string;
      abstain: string;
    },
    details: {
      title: string;
      summary: string;
      breakdown: string;
      option: string;
      votes: string;
      progress: string;
      totalVotes: string;
      validVotes: string;
      totalWeight: string;
      validWeight: string;
    };
  };
  verificationResults: {
    pass: string;
    fail: string;
    needRectification: string;
  };
  rectificationStatuses: {
    completed: string;
    inProgress: string;
    notStarted: string;
  };
  validation: {
    onlyLettersNumbersHyphens: string;
    noUnderscore: string;
    noHyphenStartEnd: string;
    lengthRequirement: string;
    accountNameUnavailable: string;
  };
  copy: {
    success: string;
    addressSuccess: string;
    textSuccess: string;
    failed: string;
  };
  web5: {
    title: string;
    did: string;
    pds: string;
    privacyControl: string;
    dataEncryption: string;
    anonymousBrowsing: string;
    dataBackup: string;
    enabled: string;
    automatic: string;
    openLink: string;
    getPDSFailed: string;
  };
  userProfile: {
    connectWithNervosTalk: string;
    connectWithX: string;
    connectWithDiscord: string;
    connectWithTelegram: string;
    joinedOn: string;
    unbindAccount: string;
    connect: string;
    connectLog: string;
    unbindLog: string;
  };
  footer: {
    companyName: string;
    twitter: string;
    telegram: string;
    discord: string;
    medium: string;
    support: string;
    privacyPolicy: string;
    termsAndConditions: string;
    mediaKit: string;
    link: string;
    docs: string;
    nervos: string;
    download: string;
  };
  proposalItem: {
    budgetApplication: string;
    approve: string;
    oppose: string;
    progress: string;
    milestone: string;
  };
  loginStep1: {
    createWeb5Account: string;
    benefit1: string;
    benefit2: string;
    benefit3: string;
    walletConnected: string;
    clickToCopyAddress: string;
    wallet: string;
    disconnect: string;
    whatIsWeb5: string;
    web5Explanation: string;
  };
  loginStep2: {
    setAccountName: string;
    namePlaceholder: string;
    validating: string;
    nameAvailable: string;
    pleaseEnterName: string;
  };
  loginModal: {
    createAccount: string;
    connectWalletFailed: string;
    disconnectWalletFailed: string;
    balanceCheckPassed: string;
    insufficientBalance: string;
    balanceCheckError: string;
    signerNotFound: string;
    recheckBalancePassed: string;
    stillInsufficientBalance: string;
    recheckBalanceError: string;
  };
  homepage: {
    proposalList: string;
    all: string;
    draft: string;
    communityReview: string;
    voting: string;
    milestoneDelivery: string;
    approved: string;
    rejected: string;
    ended: string;
    loadFailed: string;
    loading: string;
    noProposals: string;
    loadMore: string;
    searchPlaceholder: string;
    ongoingProjects: string;
    ongoingBudget: string;
  };
  userGovernance: {
    title: string;
    notLoggedIn: string;
    walletAddressDid: string;
    myVotingRights: string;
    votingRightsExplanation: string;
    stakeCKB: string;
    pending: string;
    ckbUtxoGameEngine: string;
  };
  treasuryOverview: {
    title: string;
    mainTreasuryBalance: string;
    viewTreasuryDetails: string;
  };
  projectWalletsTable: {
    title: string;
    titleTooltip: string;
    searchPlaceholder: string;
    project: string;
    currentBalance: string;
    multisigSigners: string;
    walletAddress: string;
    sampleProjectName: string;
  };
  treasuryPage: {
    treasuryInfo: string;
    mainTreasuryAddress: string;
    multisigSigners: string;
    treasuryAssets: string;
    totalAssets: string;
    allocatedFunds: string;
    availableFunds: string;
    totalAssetsStatistics: string;
  };
  proposalDetail: {
    loading: string;
    proposalNotFound: string;
    governanceHome: string;
    proposalDetails: string;
    communityDiscussion: string;
    projectBackground: string;
    projectGoals: string;
    teamIntroduction: string;
    projectBudget: string;
    milestones: string;
    milestone: string;
    budgetAmount: string;
    notFilled: string;
    currentMilestone: string;
    progress: string;
    noMilestoneInfo: string;
    deliveryTime: string;
    liking: string;
    share: string;
    proposalTypes: {
      funding: string;
      governance: string;
      technical: string;
      community: string;
      development: string;
      ecosystem: string;
      research: string;
      infrastructure: string;
      unknown: string;
    };
    stepDescriptions: {
      projectBackground: string;
      projectGoals: string;
      teamIntroduction: string;
      projectBudget: string;
      milestones: string;
    };
  };
  comment: {
    loading: string;
    loadFailed: string;
    commentsCount: string;
    noComments: string;
    placeholder: string;
    publish: string;
    reply: string;
    liking: string;
    share: string;
    quote: string;
    quoteTitle: string;
    editorLoading: string;
    quoteModal?: {
      title: string;
      preview: string;
      hint: string;
      confirm: string;
      comment: string;
      cancel: string;
      editorPlaceholder: string;
    };
    timeAgo: {
      justNow: string;
      minutesAgo: string;
      hoursAgo: string;
      daysAgo: string;
    };
  };
  proposalPhase: {
    milestoneTracking: {
      title: string;
      status: {
        completed: string;
        inProgress: string;
        cancelled: string;
        pending: string;
      };
    };
    proposalVoting: {
      title: string;
      deadline: string;
      totalVotes: string; // 总投票权重数（显示文本）
      approve: string;
      reject: string;
      myVotingPower: string;
      conditions: {
        title: string;
        minTotalVotes: string; // 最低投票权重总数（显示文本）
        approveRate: string;
        fundingRule?: string; // 资金申请类提案规则描述
        governanceRule?: string; // 元规则类提案规则描述
      };
      timeLeft: {
        days: string;
        hours: string;
        minutes: string;
        ended: string;
      };
    };
    milestoneVoting: {
      confirmVoting: string;
      deadline: string;
      totalVotes: string; // 总投票权重数（显示文本）
      approve: string;
      reject: string;
      approveFunding: string;
      rejectFunding: string;
      myVotingPower: string;
      requirements: {
        title: string;
        minTotalVotes: string; // 最低投票权重总数（显示文本）
        approveRate: string;
      };
      timeLeft: {
        days: string;
        hours: string;
        minutes: string;
        ended: string;
      };
    };
    proposalTimeline: {
      title: string;
      amaReport: string;
      events: {
        proposalPublished: string;
        proposalPublishedDesc: string;
        communityReview: string;
        communityReviewDesc: string;
        proposalVoting: string;
        proposalVotingDesc: string;
        proposalApproved: string;
        proposalApprovedDesc: string;
        proposalRejected: string;
        proposalRejectedDesc: string;
        milestoneInProgress: string;
        milestoneInProgressDesc: string;
        projectCompleted: string;
        projectCompletedDesc: string;
      };
      eventTypes: {
        default: string;
        proposalCreated: string;
        proposalEdited: string;
        initiationVote: string;
        updateReceiverAddr: string;
        voteFinished: string;
        sendInitialFund: string;
        submitMilestoneReport: string;
        submitDelayReport: string;
        milestoneVote: string;
        delayVote: string;
        sendMilestoneFund: string;
        reexamineVote: string;
        acceptanceVote: string;
        rectificationVote: string;
        submitAcceptanceReport: string;
        createAMA: string;
        submitAMAReport: string;
        createReexamineMeeting: string;
        submitReexamineReport: string;
        rectification: string;
        timelineEvent: string;
      };
    };
  };
  proposalSteps: {
    projectMilestones: {
      title: string;
      milestoneTitle: string;
      expectedDate: string;
      description: string;
      addMilestone: string;
      removeMilestone: string;
      milestonePlaceholder: string;
      datePlaceholder: string;
      descriptionPlaceholder: string;
      emptyMessage: string;
      editorLoading: string;
    };
    proposalSettings: {
      proposalType: string;
      proposalTitle: string;
      releaseDate: string;
      selectType: string;
      titlePlaceholder: string;
      datePlaceholder: string;
      types: {
        funding: string;
        governance: string;
        technical: string;
        community: string;
      };
    };
    teamIntroduction: {
      title: string;
      placeholder: string;
      editorLoading: string;
    };
    projectGoals: {
      title: string;
      placeholder: string;
      editorLoading: string;
    };
    projectBackground: {
      title: string;
      placeholder: string;
      editorLoading: string;
    };
    projectBudget: {
      title: string;
      placeholder: string;
    };
  };
  modal: {
    signatureModal: {
      title: string;
      bind: string;
      close: string;
      copy: string;
      signaturePlaceholder: string;
      messageInstruction: string;
    };
    confirmModal: {
      defaultTitle: string;
      defaultConfirm: string;
      defaultCancel: string;
    };
    successModal: {
      defaultMessage: string;
      close: string;
    };
    voteModal: {
      voteSuccess: string;
      voteFailed: string;
      voteFailedMessage: string;
      missingInfo: string;
      close: string;
    };
    voting: {
      errors: {
        prepareFailed: string;
        prepareFailedWithCode: string;
        prepareFailedInvalidFormat: string;
        submitFailedEmptyResponse: string;
        submitFailedRetry: string;
        submitFailedInvalidFormat: string;
        missingProof: string;
        missingTxHash: string;
        voteTypeArgsLengthError: string;
        witnessFormatError: string;
        buildTransactionFailed: string;
        getVoteDetailFailed: string;
        getVoteStatusFailed: string;
        queryVoteStatusFailed: string;
        updateTxHashFailed: string;
        voteFailed: string;
        userNotLoggedIn: string;
      };
      logs: {
        prepareSuccess: string;
        prepareFailed: string;
        buildTransactionFailed: string;
        txHash: string;
        milestoneVotePrepareSuccess: string;
        milestoneVotePrepareFailed: string;
      };
      options: {
        approve: string;
        reject: string;
      };
    };
  };
  chart: {
    totalAssetsChart: {
      months: {
        january: string;
        february: string;
        march: string;
        april: string;
        may: string;
        june: string;
        july: string;
        august: string;
        september: string;
        october: string;
        november: string;
        december: string;
      };
      tooltip: {
        unit: string;
      };
      yAxis: {
        unit: string;
      };
    };
  };
  discussionRecords: {
    proposalReference: string;
    commentIn: string;
    loading?: string;
    noData?: string;
    unknownProposal?: string;
  };
  recordsTable: {
    tabs: {
      proposals: string;
      voting: string;
      discussion: string;
    };
    tableHeaders: {
      proposal: string;
      type: string;
      budget: string;
      status: string;
      publishDate: string;
      actions: string;
    };
    proposalTypes: {
      budgetApplication: string;
    };
    proposalStatuses: {
      underReview: string;
      voting: string;
      milestoneDelivery: string;
      approved: string;
      rejected: string;
      ended: string;
      draft: string;
      projectReview: string;
      terminated: string;
      completed: string;
    };
    actions: {
      edit: string;
      startVoting: string;
      milestoneDelivery: string;
      rectificationComplete: string;
    };
    sampleData: {
      proposalName1: string;
      proposalName2: string;
      proposalName3: string;
      proposalName4: string;
      proposalName5: string;
    };
    loading?: string;
    noData?: string;
  };
  votingRecords: {
    tableHeaders: {
      proposal: string;
      votingStage: string;
      myChoice: string;
      voteQuantity: string;
      voteDate: string;
    };
    votingStages: {
      voting: string;
      milestoneDelivery: string;
      projectReview: string;
      finalDecision: string;
    };
    choices: {
      approve: string;
      against: string;
      abstain: string;
    };
    sampleData: {
      proposalName1: string;
      proposalName2: string;
      proposalName3: string;
    };
    loading?: string;
    noData?: string;
    unknownProposal?: string;
  };
  previewModal: {
    basicInfo: string;
    projectBackground: string;
    projectGoals: string;
    teamIntroduction: string;
    projectBudget: string;
    projectMilestones: string;
    proposalType: string;
    releaseDate: string;
    budgetAmount: string;
    expectedCompletionDate: string;
    detailedDescription: string;
    milestone: string;
    notFilled: string;
    notSet: string;
    notNamed: string;
    noMilestonesAdded: string;
  };
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const messages: Record<Locale, Messages> = {
  en: enMessages as unknown as Messages,
  zh: zhMessages as unknown as Messages,
};

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>(initialLocale || 'en');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (initialLocale) {
      setLocale(initialLocale);
      return;
    }

    // 从URL路径中获取语言代码
    const pathLocale = pathname.split('/')[1] as Locale;
    if (pathLocale && ['en', 'zh'].includes(pathLocale)) {
      setLocale(pathLocale);
    } else {
      // 从localStorage或浏览器语言设置中获取语言偏好
      try {
        const savedLocale = localStorage.getItem('locale') as Locale;
        if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
          setLocale(savedLocale);
        } else {
          // 检测浏览器语言
          const browserLang = navigator.language.split('-')[0];
          if (browserLang === 'zh') {
            setLocale('zh');
          }
        }
      } catch (error) {
        // 如果localStorage不可用，使用默认语言
        logger.warn('localStorage not available:');
      }
    }
  }, [pathname, initialLocale, isClient]);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    if (isClient) {
      try {
        localStorage.setItem('locale', newLocale);
        // 更新HTML lang属性
        document.documentElement.lang = newLocale;
      } catch (error) {
        logger.warn('Failed to save locale to localStorage:');
      }
    }
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, messages: messages[locale] }}>
      <IntlProvider locale={locale} messages={messages[locale] as unknown as Record<string, string>}>
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
