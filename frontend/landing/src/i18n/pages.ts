import { ui } from './ui';

// Define the content for each page in each language
export const pages = {
  en: {
    mission: {
      title: 'Our Mission',
      content: 'English mission content...'
    },
    press: {
      title: 'Press',
      content: 'English press content...'
    },
    terms: {
      title: 'Terms of Service',
      content: 'English terms content...'
    },
    privacy: {
      title: 'Privacy Policy',
      content: 'English privacy content...'
    }
  },
  es: {
    mission: {
      title: 'Nuestra Misión',
      content: 'Spanish mission content...'
    },
    press: {
      title: 'Prensa',
      content: 'Spanish press content...'
    },
    terms: {
      title: 'Términos de Servicio',
      content: 'Spanish terms content...'
    },
    privacy: {
      title: 'Política de Privacidad',
      content: 'Spanish privacy content...'
    }
  },
  de: {
    mission: {
      title: 'Unsere Mission',
      content: 'German mission content...'
    },
    press: {
      title: 'Presse',
      content: 'German press content...'
    },
    terms: {
      title: 'Nutzungsbedingungen',
      content: 'German terms content...'
    },
    privacy: {
      title: 'Datenschutzerklärung',
      content: 'German privacy content...'
    }
  },
  fr: {
    mission: {
      title: 'Notre Mission',
      content: 'French mission content...'
    },
    press: {
      title: 'Presse',
      content: 'French press content...'
    },
    terms: {
      title: "Conditions d'Utilisation",
      content: 'French terms content...'
    },
    privacy: {
      title: 'Politique de Confidentialité',
      content: 'French privacy content...'
    }
  },
  pt: {
    mission: {
      title: 'Nossa Missão',
      content: 'Portuguese mission content...'
    },
    press: {
      title: 'Imprensa',
      content: 'Portuguese press content...'
    },
    terms: {
      title: 'Termos de Serviço',
      content: 'Portuguese terms content...'
    },
    privacy: {
      title: 'Política de Privacidade',
      content: 'Portuguese privacy content...'
    }
  }
} as const;

export type PageContent = typeof pages[keyof typeof pages]; 