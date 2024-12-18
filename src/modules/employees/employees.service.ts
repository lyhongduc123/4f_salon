import { BadRequestException, ConflictException, forwardRef, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IEntity } from 'src/interfaces';
import { Employee } from './entity';
import { CreateEmployeeDTO, QueryEmployeeDTO, UpdateEmployeeDTO } from './dto/employee.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Branch } from '../branches/entity';
import { SchedulesService } from '../schedules/schedules.service';
import { WorkingScheduleTemplateDTO } from '../schedules/dto';
import { AppointmentsService } from '../appointments/appointments.service';

@Injectable()
export class EmployeesService implements IEntity<Employee, CreateEmployeeDTO, UpdateEmployeeDTO> {
    constructor(
        @InjectRepository(Employee)
        private employeesRepository: Repository<Employee>,
        private readonly schedulesService: SchedulesService,
        private readonly appointmentsService: AppointmentsService
    ) {}

    async findAll(): Promise<Employee[]> {
        return this.employeesRepository.find();    
    }

    async findOne(id: number): Promise<Employee> {
        return this.employeesRepository.findOneBy({ id });
    }

    async findBy(where: any): Promise<Employee[]> {
        const relations = ['branch', 'workingScheduleTemplate'];

        const res = await this.employeesRepository.find({
            where,
            relations: where.relations ? relations : [],
        });
        return res;
    }

    async getEmployeeAvailable(id: number, date: string): Promise<any> {
        const f_date = new Date(date);
        const schedules = await this.schedulesService.findWorkingScheduleTemplateByEmployee(id);
        const offday = await this.schedulesService.findSpecificOffDays({ employee_id: id, date: f_date });

        if (schedules.length === 0) {
            throw new BadRequestException('Employee not available');
        }

        let isWorking = false;
        switch (f_date.getDay()) {
            case 1:
                isWorking = schedules[0].monday;
                break;
            case 2:
                isWorking = schedules[0].tuesday;
                break;
            case 3:
                isWorking = schedules[0].wednesday;
                break;
            case 4:
                isWorking = schedules[0].thursday;
                break;
            case 5:
                isWorking = schedules[0].friday;
                break;
            case 6:
                isWorking = schedules[0].saturday;
                break;
            case 0:
                isWorking = schedules[0].sunday;
                break;
        }
        if (offday.length > 0 || !isWorking) {
            return { message: 'Employee is off on this day' };
        }
        const appointments = await this.appointmentsService.findAvailable(id, f_date);
        return appointments;
    }
  

    async create(employee: CreateEmployeeDTO, branch: Branch): Promise<Employee> {
        try{
            const employeeExists = await this.employeesRepository.findOneBy({
                email: employee.email,
                phone: employee.phone,
                name: employee.name,
            });  
            if (employeeExists) {
                throw new ConflictException('Employee already exists');
            }
            const newEmployee = this.employeesRepository.create({...employee, branch});
            const insertedEmployee = await this.employeesRepository.save(newEmployee);

            const workSchedule: WorkingScheduleTemplateDTO = {
                employee_id: newEmployee.id,
                monday: false, 
                tuesday: false,
                wednesday: false, 
                thursday: false, 
                friday: false, 
                saturday: false, 
                sunday: false
            }

            await this.schedulesService.createWorkingScheduleTemplate(workSchedule);

            return this.employeesRepository.save(newEmployee);
        } catch (error) {
            console.log(error);
            throw new BadRequestException('Error');
        }
    }

    async update(employee: UpdateEmployeeDTO): Promise<Employee> {
        if (!employee.id) {
            throw new BadRequestException('Id is required');
        }
        const employeeExist = await this.employeesRepository.findOneBy({ id: employee.id });
        if (!employeeExist) {
            throw new NotFoundException('Employee not found');
        }
        const updatedEmployee = this.employeesRepository.create(employee);

        return this.employeesRepository.save(updatedEmployee);
    }

    async remove(id: number): Promise<any> {
        await this.schedulesService.deleteWorkingScheduleTemplate(id);
        return this.employeesRepository.softDelete({ id });
    }

    async delete(id: number): Promise<any> {
        return this.employeesRepository.delete({ id });
    }
}
