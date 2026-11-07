import {
    COLLECTION_DESCRIPTION_MAX_LENGTH,
    COLLECTION_NAME_MAX_LENGTH,
    type CollectionInput,
} from '@/types/collection.types';
import type { FormSchema } from '@/utils/validation/form-validator';
import { maxLength } from '@/utils/validation/rules';

export const collectionSchema: FormSchema<CollectionInput> = {
    name: [
        (value): string | undefined =>
            value.trim() === '' ? 'Collection name is required.' : undefined,
        maxLength(
            COLLECTION_NAME_MAX_LENGTH,
            `Name must be at most ${COLLECTION_NAME_MAX_LENGTH} characters long.`,
        ),
    ],
    description: [
        maxLength(
            COLLECTION_DESCRIPTION_MAX_LENGTH,
            `Description must be at most ${COLLECTION_DESCRIPTION_MAX_LENGTH} characters long.`,
        ),
    ],
};
