import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReasonCardComponent } from './reason-card.component';

describe('ReasonCardComponent', () => {
  let component: ReasonCardComponent;
  let fixture: ComponentFixture<ReasonCardComponent>;

  const reason = {
    icon: 'labs',
    title: 'title',
    description: 'description'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReasonCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReasonCardComponent);
    fixture.componentRef.setInput('icon', reason.icon);
    fixture.componentRef.setInput('title', reason.title);
    fixture.componentRef.setInput('description', reason.description);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
