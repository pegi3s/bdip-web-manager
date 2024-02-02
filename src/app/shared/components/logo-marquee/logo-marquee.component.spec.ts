import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoMarqueeComponent } from './logo-marquee.component';

describe('LogoMarqueeComponent', () => {
  let component: LogoMarqueeComponent;
  let fixture: ComponentFixture<LogoMarqueeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogoMarqueeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogoMarqueeComponent);
    fixture.componentRef.setInput('logos', []);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
