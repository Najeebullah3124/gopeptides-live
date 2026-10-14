import { Helmet } from 'react-helmet-async';
import type { Thing, WithContext } from 'schema-dts';

type JsonLdData = WithContext<Thing> | Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <Helmet>
      {payload.map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </Helmet>
  );
}
