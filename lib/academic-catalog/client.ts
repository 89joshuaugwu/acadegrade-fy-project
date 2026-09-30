import { ACADEMIC_DEPARTMENTS, ACADEMIC_PROGRAMMES, NIGERIAN_UNIVERSITIES } from '@/lib/utils/academic-data';
import { mergeCatalogWithDefaults, type AcademicCatalogNames } from './merge';

export const DEFAULT_ACADEMIC_CATALOG: AcademicCatalogNames = {
  universities: NIGERIAN_UNIVERSITIES,
  departments: ACADEMIC_DEPARTMENTS,
  programmes: ACADEMIC_PROGRAMMES,
};

export async function loadAcademicCatalog(fetcher: typeof fetch = fetch): Promise<AcademicCatalogNames> {
  try {
    const response = await fetcher('/api/academic-catalog');
    if (!response.ok) return DEFAULT_ACADEMIC_CATALOG;
    return mergeCatalogWithDefaults(await response.json(), DEFAULT_ACADEMIC_CATALOG);
  } catch {
    return DEFAULT_ACADEMIC_CATALOG;
  }
}
