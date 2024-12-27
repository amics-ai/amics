/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				'geist': ['Geist', 'sans-serif'],
			  },
			typography: {
				DEFAULT: {
					css: {
						'max-width': 'none',
						color: '#374151',
						h2: {
							color: '#111827',
							fontWeight: '700',
							fontSize: '1.875rem',
							marginTop: '2rem',
							marginBottom: '1.25rem',
						},
						h3: {
							color: '#111827',
							fontWeight: '600',
							fontSize: '1.5rem',
							marginTop: '1.75rem',
							marginBottom: '1rem',
						},
						p: {
							marginTop: '1.25rem',
							marginBottom: '1.25rem',
							lineHeight: '1.75',
						},
						a: {
							color: '#2563eb',
							textDecoration: 'none',
							'&:hover': {
								color: '#1d4ed8',
								textDecoration: 'underline',
							},
						},
						strong: {
							color: '#111827',
							fontWeight: '600',
						},
						ul: {
							listStyleType: 'disc',
							paddingLeft: '1.625rem',
						},
						ol: {
							listStyleType: 'decimal',
							paddingLeft: '1.625rem',
						},
						li: {
							marginTop: '0.5rem',
							marginBottom: '0.5rem',
						},
						blockquote: {
							fontStyle: 'italic',
							color: '#4B5563',
							borderLeftWidth: '4px',
							borderLeftColor: '#E5E7EB',
							paddingLeft: '1rem',
							marginTop: '1.5rem',
							marginBottom: '1.5rem',
						},
						pre: {
							backgroundColor: '#1F2937',
							color: '#F9FAFB',
							padding: '1rem',
							borderRadius: '0.375rem',
							overflowX: 'auto',
						},
						code: {
							color: '#EC4899',
							backgroundColor: '#F3F4F6',
							padding: '0.25rem',
							borderRadius: '0.25rem',
							fontSize: '0.875rem',
						},
						img: {
							borderRadius: '0.5rem',
							marginTop: '2rem',
							marginBottom: '2rem',
						},
						table: {
							width: '100%',
							textAlign: 'left',
							marginTop: '2rem',
							marginBottom: '2rem',
						},
						th: {
							backgroundColor: '#F3F4F6',
							padding: '0.75rem',
							fontWeight: '600',
						},
						td: {
							padding: '0.75rem',
							borderBottomWidth: '1px',
							borderColor: '#E5E7EB',
						},
					},
				},
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
}
