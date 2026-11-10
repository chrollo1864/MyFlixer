import React from 'react';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

type LegalPageType = 'privacy' | 'terms';

interface LegalPageProps {
  type: LegalPageType;
}

const privacySections = [
  {
    title: 'Information this site handles',
    paragraphs: [
      'If you create an account, the site handles the username, display name, email address, and profile image you provide. Passwords are stored as password hashes rather than readable passwords.',
      'When you use account features, your watchlist and viewing history may be stored to synchronize them with your account. If you submit a comment or a contact, content request, or report form, the information you submit is stored so the feature can operate.'
    ]
  },
  {
    title: 'Cookies and browser storage',
    paragraphs: [
      'The site uses a session cookie to keep you signed in. Browser storage may be used for preferences and account features such as favorites and viewing history.'
    ]
  },
  {
    title: 'External services and links',
    paragraphs: [
      'The catalog may use The Movie Database (TMDB) for title metadata and may link to or embed third-party media services. When you visit an external service or use an embedded player, that service may receive information from your browser under its own privacy policy. This site does not control third-party services.'
    ]
  },
  {
    title: 'How information is used',
    paragraphs: [
      'Information is used to provide site features, maintain accounts, save submitted content, and operate or protect the service. Do not submit sensitive personal information through comments or support forms.'
    ]
  },
  {
    title: 'Your choices and contact',
    paragraphs: [
      'You can choose not to create an account and can avoid submitting information through optional forms. For questions or requests concerning account information, use the Contact link in the footer.'
    ]
  }
];

const termsSections = [
  {
    title: 'Using the site',
    paragraphs: [
      'You may use this site only in compliance with applicable laws and the rights of others. You are responsible for ensuring that your use of any content or service linked from this site is authorized where you live.'
    ]
  },
  {
    title: 'Accounts',
    paragraphs: [
      'Provide accurate account details, keep your sign-in credentials private, and notify the site operator if you believe your account has been accessed without permission. The site operator may suspend access to protect the service or address misuse.'
    ]
  },
  {
    title: 'Third-party content and services',
    paragraphs: [
      'The catalog may contain links to or embeds from third-party services. Those services are operated independently and may have their own terms, privacy practices, availability, and content. The site does not control or guarantee third-party services.'
    ]
  },
  {
    title: 'User submissions',
    paragraphs: [
      'You are responsible for comments and other information you submit. Do not submit unlawful, abusive, misleading, or private information about another person. The site operator may remove submissions or restrict access where reasonably necessary to operate the service.'
    ]
  },
  {
    title: 'Availability and changes',
    paragraphs: [
      'Features and content may change or become unavailable. The site is provided on an “as available” basis to the extent permitted by law. Nothing in these terms limits rights that cannot be limited under applicable law.'
    ]
  },
  {
    title: 'Contact',
    paragraphs: [
      'Questions about these terms can be sent using the Contact link in the footer.'
    ]
  }
];

export const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const { navigateTo, themeOptions } = useApp();
  const isPrivacy = type === 'privacy';
  const sections = isPrivacy ? privacySections : termsSections;
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const Icon = isPrivacy ? Shield : FileText;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <button
        type="button"
        onClick={() => navigateTo('home')}
        className="mb-6 inline-flex items-center gap-2 text-sm text-[#b2b1ad] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {themeOptions.general.siteName || 'home'}
      </button>

      <article className="rounded-3xl border border-[#2e3442] bg-[#242832] p-5 sm:p-8 md:p-10 shadow-xl">
        <header className="mb-8 border-b border-[#3e4555] pb-6">
          <div className="mb-3 flex items-center gap-3 text-[#db6937]">
            <Icon className="h-6 w-6" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              {themeOptions.general.siteName || 'Site information'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#b2b1ad]">
            {isPrivacy
              ? 'This page explains what information may be handled when you use this site.'
              : 'These terms describe the basic conditions for using this site and its features.'}
          </p>
        </header>

        <div className="space-y-7">
          {sections.map(section => (
            <section key={section.title} className="space-y-2.5">
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph} className="text-sm leading-7 text-[#c2c5cc]">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
};
