import React, { useEffect, useRef } from 'react';
import { AdSlotProps } from '../../services/ads/adTypes';

const NATIVE_SCRIPT_URL = 'https://bancadeltempoidea.org/21/295a4cea70299fca7890e4ac7af65489';
const RECTANGLE_SCRIPT_URL = 'https://bancadeltempoidea.org/22/e1ab3355ac39411bfd3f2c4dee527a05';
const RECTANGLE_WIDTH = 300;
const RECTANGLE_HEIGHT = 250;

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, never>;
    };
  }
}

/**
 * Loads the publisher snippets in their documented order.
 * The 300x250 unit is scaled proportionally only when the available
 * mobile width is narrower than the fixed creative.
 */
export const AdsterraSlot: React.FC<AdSlotProps> = ({ placement, className }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const nativeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const rectangle = placement === 'HOME_TOP';
    const scriptId = rectangle ? 'adsterra-300x250-script' : 'adsterra-native-script';

    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;

    const fitRectangleToAvailableWidth = () => {
      if (!rectangle) return;

      const availableWidth = host.clientWidth;
      const scale = Math.min(1, availableWidth / RECTANGLE_WIDTH);
      const scaledHeight = RECTANGLE_HEIGHT * scale;

      host.style.minHeight = `${scaledHeight}px`;

      host.querySelectorAll('iframe').forEach((frame) => {
        frame.style.width = `${RECTANGLE_WIDTH}px`;
        frame.style.height = `${RECTANGLE_HEIGHT}px`;
        frame.style.maxWidth = 'none';
        frame.style.display = 'block';
        frame.style.transform = `scale(${scale})`;
        frame.style.transformOrigin = 'top center';
        frame.style.marginBottom = `${scaledHeight - RECTANGLE_HEIGHT}px`;
      });
    };

    if (rectangle) {
      resizeObserver = new ResizeObserver(fitRectangleToAvailableWidth);
      resizeObserver.observe(host);
      mutationObserver = new MutationObserver(fitRectangleToAvailableWidth);
      mutationObserver.observe(host, { childList: true, subtree: true });
    }

    // Avoid injecting the same publisher unit twice if the component is remounted.
    if (document.getElementById(scriptId)) {
      fitRectangleToAvailableWidth();
      return () => {
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
      };
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = rectangle ? RECTANGLE_SCRIPT_URL : NATIVE_SCRIPT_URL;

    if (rectangle) {
      // This assignment is the inline part of Adsterra's supplied snippet.
      window.atOptions = {
        key: 'e1ab3355ac39411bfd3f2c4dee527a05',
        format: 'iframe',
        height: RECTANGLE_HEIGHT,
        width: RECTANGLE_WIDTH,
        params: {},
      };

      // Preserve the classic snippet's execution semantics: do not force async.
      script.async = false;
      host.appendChild(script);
    } else {
      // Adsterra's native snippet requires the script before its target container.
      script.async = true;
      script.dataset.cfasync = 'false';
      const container = nativeContainerRef.current;
      if (!container) return;
      host.insertBefore(script, container);
    }

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      script.remove();
      if (rectangle) delete window.atOptions;
    };
  }, [placement]);

  if (placement === 'HOME_TOP') {
    return (
      <div
        ref={hostRef}
        className={className || 'my-5 flex min-h-[250px] w-full items-center justify-center'}
        aria-label="Publicidad"
      />
    );
  }

  return (
    <div ref={hostRef} className={className || 'my-5 flex justify-center'} aria-label="Publicidad">
      <div
        ref={nativeContainerRef}
        id="container-295a4cea70299fca7890e4ac7af65489"
        className="w-full"
      />
    </div>
  );
};
