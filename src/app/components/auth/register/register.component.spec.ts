import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { CityService } from '../../../services/city.service';
import { ActivityCodeService } from '../../../services/activity-code.service';
import { FileService } from '../../../services/file.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { RegisterComponent } from './register.component';
const mockCities = [
  { id: '1', name: 'Beograd', postalCode: '11000' },
  { id: '2', name: 'Novi Sad', postalCode: '21000' },
  { id: '3', name: 'Niš', postalCode: '18000' },
];

const mockActivityCodes = [
  { id: 1, code: '6201', description: 'Računarstvo' },
  { id: 2, code: '6202', description: 'IT konsalting' },
];

function fillOwnerForm(component: RegisterComponent) {
  component.ownerForm.setValue({
    firstName: 'Marko',
    lastName: 'Marković',
    email: 'marko@test.com',
    password: 'Test1234!',
    phone: '+381601234567',
    city: 'Beograd',
    address: 'Ulica 1',
    businessName: 'Test Firma',
    PIB: '123456789',
    MB: '12345678',
    activityCodeId: '1',
    businessCity: 'Beograd',
    businessAddress: 'Poslovna 5',
    businessEmail: 'firma@test.com',
    businessPhone: '+381601234567',
    website: 'https://test.com',
  });
}

function fillAssistantForm(component: RegisterComponent) {
  component.assistantForm.setValue({
    firstName: 'Ana',
    lastName: 'Anić',
    email: 'ana@test.com',
    password: 'Test1234!',
    phone: '+381601234567',
    city: 'Beograd',
    address: 'Ulica 2',
    inviteToken: 'TOKEN123',
  });
}

function makeFile(name: string, type: string, size = 1000): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}
describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: any;

  let authService: jasmine.SpyObj<AuthService>;
  let cityService: jasmine.SpyObj<CityService>;
  let activityCodeService: jasmine.SpyObj<ActivityCodeService>;
  let fileService: jasmine.SpyObj<FileService>;
  let toastrService: jasmine.SpyObj<ToastrService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['registerOwner', 'registerAssistant']);
    cityService = jasmine.createSpyObj('CityService', ['getAll']);
    activityCodeService = jasmine.createSpyObj('ActivityCodeService', ['getAll']);
    fileService = jasmine.createSpyObj('FileService', ['uploadFile']);
    toastrService = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']);

    cityService.getAll.and.returnValue(of(mockCities));
    activityCodeService.getAll.and.returnValue(of(mockActivityCodes));
    authService.registerOwner.and.returnValue(of({ success: true, message: 'OK', data: null }));
    authService.registerAssistant.and.returnValue(of({ success: true, message: 'OK', data: null }));
    fileService.uploadFile.and.returnValue(of({ url: 'https://cdn.test/img.jpg', success: true, message: 'OK' }));

    await TestBed.configureTestingModule({
      declarations: [RegisterComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([]),
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: CityService, useValue: cityService },
        { provide: ActivityCodeService, useValue: activityCodeService },
        { provide: FileService, useValue: fileService },
        { provide: ToastrService, useValue: toastrService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize forms with empty default values', () => {
    expect(component.ownerForm.get('firstName')?.value).toBe('');
    expect(component.ownerForm.get('email')?.value).toBe('');
    expect(component.ownerForm.get('PIB')?.value).toBe('');
    expect(component.assistantForm.get('inviteToken')?.value).toBe('');
    expect(component.assistantForm.get('email')?.value).toBe('');
  });

  it('should default to owner role on init', () => {
    expect(component.isOwner()).toBeTrue();
    expect(component.activeForm).toBe(component.ownerForm);
  });

  it('should default showPassword to false', () => {
    expect(component.showPassword()).toBeFalse();
  });

  it('should load activity codes on initialization', () => {
    expect(activityCodeService.getAll).toHaveBeenCalled();
    expect(component.activityCodes()).toEqual(mockActivityCodes);
  });

  it('should load cities on initialization', () => {
    expect(cityService.getAll).toHaveBeenCalled();
    expect(component.cities()).toEqual(mockCities);
    expect(component.filteredCities()).toEqual(mockCities);
    expect(component.filteredBusinessCities()).toEqual(mockCities);
  });

  it('should handle error when loading activity codes fails', () => {
    activityCodeService.getAll.and.returnValue(throwError(() => ({ status: 500 })));
    component.loadActivityCodes();
    expect(toastrService.error).toHaveBeenCalled();
  });

  it('should handle error when loading cities fails', () => {
    cityService.getAll.and.returnValue(throwError(() => ({ status: 500 })));
    component.loadCities();
    expect(toastrService.error).toHaveBeenCalled();
  });

  it('should filter cities based on user input', () => {
    const event = { target: { value: 'beo' } } as unknown as Event;
    component.onCityInput(event, 'user');
    expect(component.filteredCities().length).toBe(1);
    expect(component.filteredCities()[0].name).toBe('Beograd');
  });

  it('should show city dropdown when input is focused', () => {
    component.showCityDropdown.set(false);
    const event = { target: { value: '' } } as unknown as Event;
    component.onCityInput(event, 'user');
    expect(component.showCityDropdown()).toBeTrue();
  });

  it('should hide city dropdown after selection', () => {
    component.showCityDropdown.set(true);
    component.selectCity(mockCities[0], 'user');
    expect(component.showCityDropdown()).toBeFalse();
  });

  it('should set selected city value on user selection', () => {
    component.selectCity(mockCities[0], 'user');
    expect(component.activeForm.get('city')?.value).toBe('Beograd');
  });

  it('should filter business cities based on user input', () => {
    const event = { target: { value: 'novi' } } as unknown as Event;
    component.onCityInput(event, 'business');
    expect(component.filteredBusinessCities().length).toBe(1);
    expect(component.filteredBusinessCities()[0].name).toBe('Novi Sad');
  });

  it('should set selected business city on selection', () => {
    component.selectCity(mockCities[1], 'business');
    expect(component.ownerForm.get('businessCity')?.value).toBe('Novi Sad');
    expect(component.showBusinessCityDropdown()).toBeFalse();
  });

  it('should close user dropdown after delay on blur', fakeAsync(() => {
    component.showCityDropdown.set(true);
    component.closeDropdown('user');
    expect(component.showCityDropdown()).toBeTrue(); 
    tick(200);
    expect(component.showCityDropdown()).toBeFalse();
  }));

  it('should close business dropdown after delay on blur', fakeAsync(() => {
    component.showBusinessCityDropdown.set(true);
    component.closeDropdown('business');
    tick(200);
    expect(component.showBusinessCityDropdown()).toBeFalse();
  }));

  it('should toggle password visibility when toggle button is clicked', () => {
    expect(component.showPassword()).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBeFalse();
  });

  it('should show password input as type text when showPassword is true', () => {
    component.showPassword.set(true);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="password"]');
    expect(input.type).toBe('text');
  });

  it('should show password input as type password when showPassword is false', () => {
    component.showPassword.set(false);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="password"]');
    expect(input.type).toBe('password');
  });

  it('should accept valid image file for profile picture', () => {
    const file = makeFile('photo.jpg', 'image/jpeg');
    const event = { target: { files: [file], value: '' } } as any;
    component.onProfilePictureSelect(event);
    expect(component.profilePictureFile()).toBe(file);
  });

  it('should reject non-image file for profile picture', () => {
    const file = makeFile('doc.pdf', 'application/pdf');
    const event = { target: { files: [file], value: '' } } as any;
    component.onProfilePictureSelect(event);
    expect(component.profilePictureFile()).toBeNull();
    expect(toastrService.error).toHaveBeenCalled();
  });

  it('should reject file larger than 10MB for profile picture', () => {
    const file = makeFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024);
    const event = { target: { files: [file], value: '' } } as any;
    component.onProfilePictureSelect(event);
    expect(component.profilePictureFile()).toBeNull();
    expect(toastrService.error).toHaveBeenCalled();
  });

  it('should generate preview URL for selected profile picture', fakeAsync(() => {
    const file = makeFile('photo.jpg', 'image/jpeg');
    const event = { target: { files: [file], value: '' } } as any;

    const mockReader = {
      onload: null as any,
      readAsDataURL(f: File) { this.onload({ target: { result: 'data:image/jpeg;base64,abc' } }); },
    };
    spyOn(window as any, 'FileReader').and.returnValue(mockReader);

    component.onProfilePictureSelect(event);
    expect(component.profilePicturePreview()).toBe('data:image/jpeg;base64,abc');
  }));

  it('should clear profile picture file and preview when invalid file is selected', () => {
    component.profilePictureFile.set(makeFile('old.jpg', 'image/jpeg'));
    component.profilePicturePreview.set('data:old');
    const file = makeFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024);
    const event = { target: { files: [file], value: '' } } as any;
    component.onProfilePictureSelect(event);
    expect(component.profilePictureFile()).toBeNull();
    expect(component.profilePicturePreview()).toBeNull();
  });


  it('should accept valid image file for company logo', () => {
    const file = makeFile('logo.png', 'image/png');
    const event = { target: { files: [file], value: '' } } as any;
    component.onCompanyLogoSelect(event);
    expect(component.companyLogoFile()).toBe(file);
  });

  it('should reject non-image file for company logo', () => {
    const file = makeFile('doc.pdf', 'application/pdf');
    const event = { target: { files: [file], value: '' } } as any;
    component.onCompanyLogoSelect(event);
    expect(component.companyLogoFile()).toBeNull();
    expect(toastrService.error).toHaveBeenCalled();
  });

  it('should reject file larger than 10MB for company logo', () => {
    const file = makeFile('big.png', 'image/png', 11 * 1024 * 1024);
    const event = { target: { files: [file], value: '' } } as any;
    component.onCompanyLogoSelect(event);
    expect(component.companyLogoFile()).toBeNull();
    expect(toastrService.error).toHaveBeenCalled();
  });

  it('should generate preview URL for selected company logo', fakeAsync(() => {
    const file = makeFile('logo.png', 'image/png');
    const event = { target: { files: [file], value: '' } } as any;

    const mockReader = {
      onload: null as any,
      readAsDataURL(f: File) { this.onload({ target: { result: 'data:image/png;base64,xyz' } }); },
    };
    spyOn(window as any, 'FileReader').and.returnValue(mockReader);

    component.onCompanyLogoSelect(event);
    expect(component.companyLogoPreview()).toBe('data:image/png;base64,xyz');
  }));

  it('should clear company logo file and preview when invalid file is selected', () => {
    component.companyLogoFile.set(makeFile('old.png', 'image/png'));
    component.companyLogoPreview.set('data:old');
    const file = makeFile('big.png', 'image/png', 11 * 1024 * 1024);
    const event = { target: { files: [file], value: '' } } as any;
    component.onCompanyLogoSelect(event);
    expect(component.companyLogoFile()).toBeNull();
    expect(component.companyLogoPreview()).toBeNull();
  });

  it('should call registerOwner with correct DTO when submitting owner form', () => {
    fillOwnerForm(component);
    component.onSubmit();
    expect(authService.registerOwner).toHaveBeenCalledWith(
      jasmine.objectContaining({
        user: jasmine.objectContaining({ email: 'marko@test.com' }),
        business: jasmine.objectContaining({ PIB: '123456789' }),
      })
    );
  });

  it('should register owner without images when none are selected', () => {
    fillOwnerForm(component);
    component.onSubmit();
    expect(fileService.uploadFile).not.toHaveBeenCalled();
    expect(authService.registerOwner).toHaveBeenCalled();
  });

  it('should upload profile picture before owner registration when file is selected', () => {
    fillOwnerForm(component);
    component.profilePictureFile.set(makeFile('pic.jpg', 'image/jpeg'));
    component.onSubmit();
    expect(fileService.uploadFile).toHaveBeenCalledTimes(1);
    expect(authService.registerOwner).toHaveBeenCalledWith(
      jasmine.objectContaining({
        user: jasmine.objectContaining({ profilePicture: 'https://cdn.test/img.jpg' }),
      })
    );
  });

  it('should upload company logo before owner registration when file is selected', () => {
    fillOwnerForm(component);
    component.companyLogoFile.set(makeFile('logo.png', 'image/png'));
    component.onSubmit();
    expect(fileService.uploadFile).toHaveBeenCalledTimes(1);
    expect(authService.registerOwner).toHaveBeenCalledWith(
      jasmine.objectContaining({
        business: jasmine.objectContaining({ companyLogo: 'https://cdn.test/img.jpg' }),
      })
    );
  });

  it('should upload both images when both are selected', () => {
    fillOwnerForm(component);
    component.profilePictureFile.set(makeFile('pic.jpg', 'image/jpeg'));
    component.companyLogoFile.set(makeFile('logo.png', 'image/png'));

    fileService.uploadFile.and.returnValues(
      of({ url: 'https://cdn.test/profile.jpg', success: true, message: 'OK' }),
      of({ url: 'https://cdn.test/logo.png', success: true, message: 'OK' }),
    );

    component.onSubmit();
    expect(fileService.uploadFile).toHaveBeenCalledTimes(2);
    expect(authService.registerOwner).toHaveBeenCalledWith(
      jasmine.objectContaining({
        user: jasmine.objectContaining({ profilePicture: 'https://cdn.test/profile.jpg' }),
        business: jasmine.objectContaining({ companyLogo: 'https://cdn.test/logo.png' }),
      })
    );
  });

  it('should show success message and redirect to login on successful owner registration', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');
    authService.registerOwner.and.returnValue(of({ success: true, message: 'OK', data: null }));
    fillOwnerForm(component);
    component.onSubmit();
    expect(toastrService.success).toHaveBeenCalled();
    tick(1500);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  }));

  it('should handle upload error during owner registration', () => {
    fillOwnerForm(component);
    component.profilePictureFile.set(makeFile('pic.jpg', 'image/jpeg'));
    fileService.uploadFile.and.returnValue(throwError(() => ({ error: { message: 'Upload failed' } })));
    component.onSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should handle backend validation errors during owner registration', () => {
    fillOwnerForm(component);
    authService.registerOwner.and.returnValue(throwError(() => ({
      error: {
        errors: {
          'User.Email': ['Email već postoji'],
        },
      },
    })));
    component.onSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should call registerAssistant with correct DTO when submitting assistant form', () => {
    component.setRole(false);
    fillAssistantForm(component);
    component.onSubmit();
    expect(authService.registerAssistant).toHaveBeenCalledWith(
      jasmine.objectContaining({
        inviteToken: 'TOKEN123',
        user: jasmine.objectContaining({ email: 'ana@test.com' }),
      })
    );
  });

  it('should show success message and redirect to login on successful assistant registration', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');
    authService.registerAssistant.and.returnValue(of({ success: true, message: 'OK', data: null }));
    component.setRole(false);
    fillAssistantForm(component);
    component.onSubmit();
    expect(toastrService.success).toHaveBeenCalled();
    tick(1500);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  }));

  it('should handle backend validation errors during assistant registration', () => {
    component.setRole(false);
    fillAssistantForm(component);
    authService.registerAssistant.and.returnValue(throwError(() => ({
      error: {
        errors: {
          InviteToken: ['Token nije validan'],
        },
      },
    })));
    component.onSubmit();
    expect(toastrService.error).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should display frontend validation errors as toastr warnings on invalid submit', () => {
    component.ownerForm.get('firstName')?.setValue('');
    component.onSubmit();
    expect(toastrService.warning).toHaveBeenCalled();
  });

  it('should display pattern validation message', () => {
    component.ownerForm.get('PIB')?.setValue('abc'); // doesn't match \d{9}
    component.ownerForm.get('PIB')?.markAsTouched();
    component.onSubmit();
    expect(toastrService.warning).toHaveBeenCalled();
  });

  it('should display email validation message', () => {
    // Fill everything valid then break email
    fillOwnerForm(component);
    component.ownerForm.get('email')?.setValue('not-an-email');
    component.onSubmit();
    expect(toastrService.warning).toHaveBeenCalled();
  });

  it('should parse FluentValidation errors and display field-specific error messages', () => {
    fillOwnerForm(component);
    authService.registerOwner.and.returnValue(throwError(() => ({
      error: {
        errors: {
          'User.Email': ['Email nije validan'],
          'Business.PIB': ['PIB mora imati 9 cifara'],
        },
      },
    })));
    component.onSubmit();
    expect(toastrService.error).toHaveBeenCalledTimes(2);
  });


  it('should set isLoading to false after registration error', () => {
    fillOwnerForm(component);
    authService.registerOwner.and.returnValue(throwError(() => ({ error: {} })));
    component.onSubmit();
    expect(component.isLoading()).toBeFalse();
  });

  it('should disable submit button while loading', () => {
    component.isLoading.set(true);
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeTrue();
  });

  it('should disable submit button when form is invalid', () => {
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeTrue();
  });

  it('should return ownerForm when isOwner is true', () => {
    component.setRole(true);
    expect(component.activeForm).toBe(component.ownerForm);
  });

  it('should return assistantForm when isOwner is false', () => {
    component.setRole(false);
    expect(component.activeForm).toBe(component.assistantForm);
  });

  it('should switch to assistant form when setRole(false) is called', () => {
    component.setRole(false);
    expect(component.isOwner()).toBeFalse();
    expect(component.activeForm).toBe(component.assistantForm);
  });

  it('should switch back to owner form when setRole(true) is called', () => {
    component.setRole(false);
    component.setRole(true);
    expect(component.isOwner()).toBeTrue();
    expect(component.activeForm).toBe(component.ownerForm);
  });

  it('should not call registerOwner when owner form is invalid', () => {
    component.onSubmit();
    expect(authService.registerOwner).not.toHaveBeenCalled();
  });

  it('should not call registerAssistant when assistant form is invalid', () => {
    component.setRole(false);
    component.onSubmit();
    expect(authService.registerAssistant).not.toHaveBeenCalled();
  });

  it('should markAllAsTouched when form is submitted while invalid', () => {
    const spy = spyOn(component.ownerForm, 'markAllAsTouched');
    component.onSubmit();
    expect(spy).toHaveBeenCalled();
  });
});