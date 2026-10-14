import type {
  BlogPosting,
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  ItemList,
  LocalBusiness,
  Organization,
  Product,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts';
import { siteUrl } from './seoService';

export type TypedSchema =
  | WithContext<Organization>
  | WithContext<WebSite>
  | WithContext<WebPage>
  | WithContext<Product>
  | WithContext<BreadcrumbList>
  | WithContext<BlogPosting>
  | WithContext<FAQPage>
  | WithContext<CollectionPage>
  | WithContext<ItemList>
  | WithContext<LocalBusiness>;

function abs(path: string): string {
  const base = siteUrl();
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function toJsonLd(schema: TypedSchema | Record<string, unknown>): string {
  return JSON.stringify(schema);
}

export { abs as schemaAbs, siteUrl as schemaSiteUrl };
