export interface ChipOption {
    id: string;
    label: string;
}

export interface ChipGroupProperties {
    options: ChipOption[];
    activeId: string;
    onChange?: (id: string) => void;
    modifier?: string;
}
