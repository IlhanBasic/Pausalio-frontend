export interface AddCountryDto {
    name: string;
    code: string
}
export interface UpdateCountryDto {
    name: string;
    code: string
}
export interface CountryToReturnDto {
    id: string,
    name: string;
    code: string
}