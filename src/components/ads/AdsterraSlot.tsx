import React, { useEffect, useRef } from 'react';
import { AdSlotProps } from '../../services/ads/adTypes';

const NATIVE_SCRIPT_URL = 'https://bancadeltempoidea.org/21/295a4cea70299fca7890e4ac7af65489';
const RECTANGLE_SCRIPT_URL = 'https://bancadeltempoidea.org/22/e1ab3355ac39411bfd3f2c4dee527a05';

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

/** Injects the selected publisher script only after the React slot mounts. */
export const AdsterraSlot: React.FC<AdSlotProps> = ({ placement, className }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const rectangle = placement === 'HOME_TOP';
    const scriptId = rectangle ? 'adsterra-300x250-script' : 'adsterra-native-script';
    const script = document.createElement('script');

    if (document.getElementById(scriptId)) return;

    if (rectangle) {
      window.atOptions = {
        key: 'e1ab3355ac39411bfd3f2c4dee527a05',
        format: 'iframe',
        height: 250,
        width: 300,
        params: {},
      };
    }

    script.id = scriptId;
    script.async = true;
    script.src = rectangle ? RECTANGLE_SCRIPT_URL : NATIVE_SCRIPT_URL;
    if (!rectangle) script.dataset.cfasync = 'false';
    host.appendChild(script);

    return () => {
      script.remove();
      if (rectangle) delete window.atOptions;
    };
  }, [placement]);

  if (placement === 'HOME_TOP') {
    return <div className={className || 'my-5 flex justify-center'} aria-label="Publicidad">
      <div ref={hostRef} className="min-h-[250px] min-w-[300px]" />
    </div>;
  }

  return <div className={className || 'my-5 flex justify-center'} aria-label="Publicidad">
    <div ref={hostRef} id="container-295a4cea70299fca7890e4ac7af65489" className="w-full" />
  </div>;
};
