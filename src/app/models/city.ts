export interface AddCityDto{
    name:string;
    postalCode: string;
}
export interface UpdateCityDto {
    name:string;
    postalCode: string;
}
export interface CityToReturnDto
{
    id: string;
    name:string
    postalCode: string;
}