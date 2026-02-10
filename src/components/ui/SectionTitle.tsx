import React from 'react';
import Heading from './Heading';
import { spacing } from '../../theme/tokens';

export default function SectionTitle({ children }: { children: string }) {
  return (
    <Heading
      level={2}
      style={{
        marginTop: spacing(3),
        marginBottom: spacing(1.5)
      }}
    >
      {children}
    </Heading>
  );
}