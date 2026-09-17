import { BaseComponent } from '@/components/base-component';
import { HeroSection } from './sections/hero/hero';

export class HomePage extends BaseComponent {
    public constructor() {
        super('main', 'home-page');

        this.element.append(new HeroSection().element);
    }
}
