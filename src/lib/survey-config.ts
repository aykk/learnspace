export const SURVEY_CONFIG = {
  survey: {
    learningStyle: {
      question: 'How do you learn best?',
      options: [
        {
          id: 'verbal',
          label: 'Verbal / Text',
          description: 'Learn through reading, writing, and visual text.',
        },
        {
          id: 'audio',
          label: 'Audio / Podcast',
          description: 'Learn through listening to spoken explanations and discussions.',
        },
      ],
    },
    verbal: {
      textFormat: {
        question: 'Preferred Text Format?',
        options: [
          { id: 'bullet', label: 'Bullet Points' },
          { id: 'paragraph', label: 'Paragraphs' },
          { id: 'mixed', label: 'Mixed' },
        ],
      },
      jargonLevel: {
        question: 'Technical Jargon?',
        options: [
          { id: 'none', label: 'Simple', description: 'No specialized terminology' },
          { id: 'some', label: 'Some', description: 'Moderate specialized terminology' },
          { id: 'technical', label: 'Technical', description: 'Full specialized terminology' },
        ],
      },
      interests: {
        question: 'Your Interests?',
        description: 'Select topics you enjoy for analogies and examples.',
        options: [
          'Sports',
          'Music',
          'Cooking',
          'Gaming',
          'Nature',
          'Movies',
          'Technology',
          'Art',
          'Travel',
          'Fitness',
          'History',
          'Science',
          'Business',
          'Philosophy',
        ],
        allowCustom: true,
      },
    },
    audio: {
      podcastLength: {
        question: 'Ideal Podcast Length?',
        options: [
          { id: 'short', label: '1 min' },
          { id: 'medium', label: '3 min' },
          { id: 'long', label: '5 min' },
        ],
      },
      podcastStyle: {
        question: 'Podcast Style?',
        options: [
          { id: 'conversational', label: 'Conversational' },
          { id: 'educational', label: 'Direct & Educational' },
          { id: 'storytelling', label: 'Storytelling' },
        ],
      },
    },
    background: {
      question: 'Tell us about yourself?',
      description: 'This helps us tailor content to your level and context.',
      options: [
        { id: 'student', label: 'Student' },
        { id: 'professional', label: 'Professional' },
        { id: 'hobbyist', label: 'Hobbyist' },
        { id: 'researcher', label: 'Researcher' },
        { id: 'other', label: 'Other' },
      ],
      allowDetails: true,
      detailsPlaceholder: 'Tell us more (e.g., CS major, marketing manager)',
    },
    extraNotes: {
      question: 'Anything else?',
      description: 'Any extra notes or preferences about your learning style that we should know?',
      type: 'freeText',
      optional: true,
      placeholder:
        'e.g., I learn best with real-world examples, I prefer shorter explanations, I\'m a visual thinker...',
    },
  },
} as const;
