import { browser } from '$app/environment';
import type { EventData, TrackedProperties, WindowWithUmami } from './types';
import type { UmamiTrackerConfiguration } from './types';

declare let window: WindowWithUmami;

export function disableTracking(): void {
	if (browser && localStorage) {
		localStorage.setItem('umami.disabled', 'true');
	}
}

export function enableTracking(): void {
	if (browser && localStorage) {
		localStorage.removeItem('umami.disabled');
	}
}

export function isTrackingEnabled(): boolean {
	if (browser && localStorage) {
		return !(localStorage.getItem('umami.disabled') === 'true') && window.umami !== undefined;
	}
	return false;
}

/**
 * Track a page view with and without custom properties
 * @param properties
 * @returns
 */
export function trackPageView(properties?: TrackedProperties): Promise<string> {
	if (!browser) return Promise.resolve('');

	if (!window.umami) return Promise.resolve('Umami not found.');

	if (properties) {
		return window.umami.track((props: TrackedProperties) => ({
			...props,
			...properties
		}));
	} else {
		return window.umami.track();
	}
}

/**
 * - Track an event with a given name
 * @param eventName Note: event names will be truncated past 50 characters
 * @param eventData
 * @returns
 */
export function trackEvent(eventName: string, eventData?: EventData): Promise<string> {
	if (!browser) return Promise.resolve('');

	if (!window.umami) return Promise.resolve('Umami not found.');

	if (eventData) {
		return window.umami.track(eventName, eventData);
	} else {
		return window.umami.track(eventName);
	}
}

const SCRIPT_ID = 'umami_analytics_script';

/**
 * Adding the script would fail for example if the user is running
 * an ad blocker. This Promise can handle that case.
 */
async function registerUmamiScript(
	websiteID: string,
	srcURL: string = 'https://eu.umami.is/script.js'
) {
	return new Promise((resolve, reject) => {
		const head = document.head || document.getElementsByTagName('head')[0];

		const script = document.createElement('script');
		script.id = SCRIPT_ID;
		script.async = true;
		script.defer = true;
		script.setAttribute('data-website-id', websiteID);
		script.setAttribute('data-testid', SCRIPT_ID);
		script.src = srcURL;

		const element = head.appendChild(script);

		script.onload = resolve;
		script.onerror = reject;

		return element;
	});
}

export async function registerUmami(
	websiteID: string,
	srcURL: string,
	configuration: UmamiTrackerConfiguration
) {
	// We add the script only once even when the component rendered twice and don't run while SSR.
	if (!browser || window.document.getElementById(SCRIPT_ID)) return;

	try {
		registerUmamiScript(websiteID, srcURL);

		const umamiScript = document.getElementById(SCRIPT_ID);
		if (umamiScript) {
			setScriptSettingsProps(umamiScript, configuration);
		} else {
			console.error('umami script not found');
		}
	} catch (err) {
		console.error('umami failure');
		const s = window.document.getElementById(SCRIPT_ID);
		if (s) {
			s.remove();
		}
	}
}

function setScriptSettingsProps(scriptElem: HTMLElement, config: UmamiTrackerConfiguration) {
	if (config['data-host-url']) scriptElem.setAttribute('data-host-url', config['data-host-url']);
	if (config['data-auto-track'] !== undefined && !config['data-auto-track'])
		scriptElem.setAttribute('data-auto-track', 'false');
	if (config['data-cache']) scriptElem.setAttribute('data-cache', 'true');
	if (config['data-domains']) scriptElem.setAttribute('data-domains', config['data-domains']);
	if (config['data-exclude-search']) scriptElem.setAttribute('data-exclude-search', 'true');
	if (config['data-tag']) scriptElem.setAttribute('data-tag', config['data-tag']);
}

export function handleClick(e: MouseEvent, eventName: string) {
	const target = e.currentTarget as unknown as EventData;
	trackEvent(eventName, target);
}