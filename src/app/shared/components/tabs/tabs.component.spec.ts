import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TabsComponent } from './tabs.component';

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  const tabs = [{ id: 'tab1', label: 'Tab 1', active: true }, { id: 'tab2', label: 'Tab 2' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsComponent],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TabsComponent);
    fixture.componentRef.setInput('tabs', tabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the tabs', () => {
    const tabsRendered = fixture.debugElement.queryAll(By.css('.tab'));
    expect(tabsRendered.length).toBe(tabs.length);
  });

  it('should display the active tab', () => {
    const activeTab = fixture.debugElement.query(By.css('input:checked'));
    expect(activeTab.nativeElement.id).toContain(tabs[0].id);
  });

  it('should emit the selected tab on onSelectTab', () => {
    spyOn(component.activeTab, 'emit');
    const expectedTab = tabs[0];
    component.onSelectTab(expectedTab);
    expect(component.activeTab.emit).toHaveBeenCalledWith(expectedTab.id);
  });
});
