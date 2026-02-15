import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ReactNode } from 'react';
import { Linking, Pressable, type PressableProps } from 'react-native';

type Props = Omit<PressableProps, 'children'> & {
  children: ReactNode;
  href: string;
};

export function ExternalLink({ href, children, onPress, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      {...rest}
      onPress={async (event) => {
        onPress?.(event);
        if (event.defaultPrevented) {
          return;
        }

        if (typeof window === 'undefined') {
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
          return;
        }

        await Linking.openURL(href);
      }}>
      {children}
    </Pressable>
  );
}
